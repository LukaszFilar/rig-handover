import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl: 5 jobs, 1 bad line', () => {
    const d = readNight('runs', '2026-10-28')!;
    expect(d.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(d.badLines).toBe(1);
  });

  it('counts runs and retries, and keeps the last error', () => {
    const d = readNight('runs', '2026-10-28')!;
    const fixtures = d.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fixtures).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: null, owner: 'rook' });
    expect(fixtures.first).toBe('2026-10-29T01:30:00+01:00');
    expect(fixtures.last).toBe('2026-10-29T01:37:00+01:00');
    const backup = d.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup).toMatchObject({ lastStatus: 'fail', lastError: 'quota exceeded' });
  });

  it('keeps a row whose owner is null', () => {
    const row = readNight('runs', '2026-10-28')!.rows.find((r) => r.job === 'digest/render')!;
    expect(row.owner).toBeNull();
  });

  it('returns null for a night with no file or a bad name', () => {
    expect(readNight('runs', '2001-01-01')).toBeNull();
    expect(readNight('runs', '../package')).toBeNull();
  });

  it('gives no rows for an empty file, and counts bad lines without throwing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'rig-'));
    writeFileSync(join(dir, '2026-01-01.jsonl'), '');
    writeFileSync(join(dir, '2026-01-02.jsonl'), 'not json\n{"at":"x"}\n[]\n');
    expect(readNight(dir, '2026-01-01')).toEqual({ night: '2026-01-01', rows: [], badLines: 0 });
    expect(readNight(dir, '2026-01-02')).toEqual({ night: '2026-01-02', rows: [], badLines: 3 });
  });
});
