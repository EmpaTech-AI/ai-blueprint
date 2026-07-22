// T-07 (durable form): single-source build identity.
// The pipeline label is read from ONE source (env override -> package.json "pipelineLabel"),
// never a hand-typed literal at an emission site -- the Era-N batch shipped a stale
// "pipeline=v35.1" label from a hardcoded string while the actual build was commit 569827b
// (the v1.1 skills). Honest "unknown" beats a confident wrong label. The verifiable anchor
// remains the commit SHA (RAILWAY_GIT_COMMIT_SHA); the label is a human-readable tag only.
import fs from 'fs';
import path from 'path';

function readPkgLabel(): string {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf-8'));
    return pkg.pipelineLabel ?? pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export const BUILD = {
  pipelineLabel: process.env.PIPELINE_LABEL ?? readPkgLabel(),
  sha: process.env.RAILWAY_GIT_COMMIT_SHA ?? 'unset',
  anchored(): boolean { return this.sha !== 'unset'; },
};
