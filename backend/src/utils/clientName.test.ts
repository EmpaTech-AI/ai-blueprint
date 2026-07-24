import { extractIntakeClientName, resolveClientTitleName } from './clientName';

// S-46 (Era-O′): the delivery title must come from INTAKE_FACTS CLIENT_NAME, never the
// operator-typed job label ("Tommy Shelby 3" class of defect).
describe('extractIntakeClientName', () => {
  it('reads CLIENT_NAME with the contract ":" separator', () => {
    const dossier = 'preamble\n<!-- INTAKE_FACTS\nCLIENT_NAME: Meridian Talent Partners OOD\nCEO_NAME: Dimitar Popov\n-->\nbody';
    expect(extractIntakeClientName(dossier)).toBe('Meridian Talent Partners OOD');
  });

  it('tolerates the "=" separator like the app facts parser', () => {
    const dossier = '<!-- INTAKE_FACTS\nCLIENT_NAME=Meridian Talent Partners OOD\n-->';
    expect(extractIntakeClientName(dossier)).toBe('Meridian Talent Partners OOD');
  });

  it('returns null when the block or field is absent/empty', () => {
    expect(extractIntakeClientName('no facts here')).toBeNull();
    expect(extractIntakeClientName('<!-- INTAKE_FACTS\nCEO_NAME: X\n-->')).toBeNull();
    expect(extractIntakeClientName('<!-- INTAKE_FACTS\nCLIENT_NAME:\n-->')).toBeNull();
    expect(extractIntakeClientName(null)).toBeNull();
  });
});

describe('resolveClientTitleName', () => {
  it('prefers the dossier name over the operator job label', () => {
    const dossier = '<!-- INTAKE_FACTS\nCLIENT_NAME: Meridian Talent Partners OOD\n-->';
    expect(resolveClientTitleName(dossier, 'Tommy Shelby 3')).toBe('Meridian Talent Partners OOD');
  });

  it('falls back to the job label only when no dossier name exists', () => {
    expect(resolveClientTitleName(null, 'Tommy Shelby 3')).toBe('Tommy Shelby 3');
    expect(resolveClientTitleName('<!-- INTAKE_FACTS\nCEO_NAME: X\n-->', 'Fallback Co')).toBe('Fallback Co');
  });
});
