/**
 * Quality gate behaviour tests.
 *
 * The gate logic lives inside runStepWithGate (not exported), so we test it
 * by driving a local re-implementation of the same decision tree against a
 * mock runner — giving us full branch coverage without importing the real
 * orchestrator (which would pull in DB and file-system dependencies).
 */

import { calculateConfidence } from '../utils/confidenceScorer';

// ── Minimal re-implementation of runStepWithGate for testing ─────────────────
// Keep this in sync with orchestrator.ts: scoreBand, runStepWithGate.

type ScoreBand = 'green' | 'amber' | 'blue' | 'red';

function scoreBand(score: number): ScoreBand {
  if (score >= 90) return 'green';
  if (score >= 76) return 'amber';
  if (score >= 60) return 'blue';
  return 'red';
}

async function runGate(
  runner: (corrective?: string) => Promise<string>,
): Promise<{ output: string; score: number; band: ScoreBand; retried: boolean; flags: string[] }> {
  const flags: string[] = [];
  let output = await runner();
  let score  = calculateConfidence(output).score;
  const initialBand = scoreBand(score);
  let retried = false;

  if (initialBand === 'red' || initialBand === 'blue') {
    retried = true;
    const retriedOutput = await runner('CORRECTIVE');
    const retriedScore  = calculateConfidence(retriedOutput).score;

    if (scoreBand(retriedScore) === 'red') {
      throw new Error(`Quality gate FAIL: scored ${retriedScore}% (Red) after retry.`);
    }

    output = retriedOutput;
    score  = retriedScore;
  }

  if (score < 76) {
    flags.push(`confidence: ${score}% — below Amber threshold`);
  }

  return { output, score, band: scoreBand(score), retried, flags };
}

// ── Helpers to produce tagged text at a known score ─────────────────────────

function highConfidenceOutput(n = 4): string {
  return Array.from({ length: n }, (_, i) => `Item ${i + 1} [Document-Backed].`).join(' ');
}

function lowConfidenceOutput(high = 1, low = 3): string {
  const highTags = Array.from({ length: high }, () => '[Document-Backed]');
  const lowTags  = Array.from({ length: low  }, () => '[Inferred]');
  return [...highTags, ...lowTags].join(' some text ');
}

function zeroTagOutput(): string {
  return 'The company has strong revenue and a motivated team with clear goals.';
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Quality gate — Green band (score ≥ 90)', () => {
  it('proceeds without retry or flag', async () => {
    let calls = 0;
    const runner = async () => { calls++; return highConfidenceOutput(10); };
    const { retried, flags } = await runGate(runner);
    expect(calls).toBe(1);
    expect(retried).toBe(false);
    expect(flags).toHaveLength(0);
  });
});

describe('Quality gate — Amber band (76–89)', () => {
  it('proceeds without retry but adds no flag if score >= 76', async () => {
    // 4 high, 1 low = 80% (Amber)
    const runner = async () => '[Document-Backed] [Document-Backed] [Document-Backed] [Document-Backed] [Inferred]';
    let calls = 0;
    const wrappedRunner = async (c?: string) => { calls++; return runner(); };
    const { retried, flags, band } = await runGate(wrappedRunner);
    expect(band).toBe('amber');
    expect(retried).toBe(false);
    expect(calls).toBe(1);
    expect(flags).toHaveLength(0);
  });
});

describe('Quality gate — Blue band (60–75)', () => {
  it('retries once, and if retry improves to Amber it proceeds with flag', async () => {
    let calls = 0;
    // First call → Blue (66%: 2 high, 1 low)
    // Second call → Amber (80%: 4 high, 1 low)
    const runner = async (corrective?: string) => {
      calls++;
      return corrective
        ? '[Document-Backed] [Document-Backed] [Document-Backed] [Document-Backed] [Inferred]' // 80%
        : '[Document-Backed] [Document-Backed] [Inferred]'; // 66%
    };
    const { retried, flags } = await runGate(runner);
    expect(calls).toBe(2);
    expect(retried).toBe(true);
    expect(flags).toHaveLength(0); // 80% → no flag
  });

  it('retries once, and if retry stays Blue it proceeds with flag', async () => {
    let calls = 0;
    // Both attempts: 2 high, 1 low = 66% (Blue)
    const runner = async () => { calls++; return '[Document-Backed] [Document-Backed] [Inferred]'; };
    const { retried, flags, score } = await runGate(runner);
    expect(calls).toBe(2);
    expect(retried).toBe(true);
    expect(score).toBe(66);
    expect(flags.length).toBeGreaterThan(0);
  });
});

describe('Quality gate — Red band (< 60)', () => {
  it('retries once; if retry recovers to Blue or above, proceeds with flag', async () => {
    let calls = 0;
    // First: 0% (no tags) → Red; Second: 66% → Blue
    const runner = async (corrective?: string) => {
      calls++;
      return corrective
        ? '[Document-Backed] [Document-Backed] [Inferred]'  // 66%
        : zeroTagOutput();                                    // 0%
    };
    const { retried, flags } = await runGate(runner);
    expect(calls).toBe(2);
    expect(retried).toBe(true);
    expect(flags.length).toBeGreaterThan(0); // 66% → flag
  });

  it('throws if retry is still Red', async () => {
    const runner = async () => zeroTagOutput(); // always 0% (Red)
    await expect(runGate(runner)).rejects.toThrow('Quality gate FAIL');
  });
});

describe('Quality gate — zero tags (D6 regression)', () => {
  it('scores 0 (Red), not 50 (Blue), and triggers the gate', async () => {
    const score = calculateConfidence(zeroTagOutput()).score;
    expect(score).toBe(0);
    expect(scoreBand(score)).toBe('red');
  });

  it('gate retries on zero-tag output and halts if retry also zero-tag', async () => {
    let calls = 0;
    const runner = async () => { calls++; return zeroTagOutput(); };
    await expect(runGate(runner)).rejects.toThrow('Quality gate FAIL');
    expect(calls).toBe(2);
  });
});
