import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { NightDigest } from '../src/digest/types.js';

const baseConfig = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60 };
const fixtureConfig = { ...baseConfig, runsDir: 'runs' };

const GOOD = '{"at":"2026-11-02T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}';
const GARBAGE = 'not json at all';

let tmp: string;
let tmpConfig: typeof fixtureConfig;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'rig-routes-'));
  writeFileSync(join(tmp, '2026-11-01.jsonl'), '');
  writeFileSync(join(tmp, '2026-11-02.jsonl'), `${GOOD}\n${GARBAGE}\n`);
  tmpConfig = { ...baseConfig, runsDir: tmp };
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

// Job names in the order they appear in the digest table body.
function pageJobs(html: string): string[] {
  return [...html.matchAll(/<tr>\s*<td[^>]*>([^<]*)</g)].map((m) => m[1]!);
}

describe('GET /digest/:night', () => {
  it('answers 200 with the table for a night with data', async () => {
    const res = await createApp(fixtureConfig).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('digest 2026-10-28');
    expect(pageJobs(html)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(fixtureConfig).request('/digest/2001-01-01');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe('no digest for this night');
  });

  it('says "nothing ran" for an empty night', async () => {
    const res = await createApp(tmpConfig).request('/digest/2026-11-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
    expect(pageJobs(html)).toEqual([]);
  });

  it('shows the bad-line note and still lists the good rows', async () => {
    const res = await createApp(tmpConfig).request('/digest/2026-11-02');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('1 line could not be read');
    expect(pageJobs(html)).toEqual(['lane/sync']);
  });

  it('shows the bad-line note for the fixture (1 bad line)', async () => {
    const html = await (await createApp(fixtureConfig).request('/digest/2026-10-28')).text();
    expect(html).toContain('1 line could not be read');
  });
});

describe('GET /api/digest/:night', () => {
  it('answers 200 with the digest for a night with data', async () => {
    const res = await createApp(fixtureConfig).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    const body = (await res.json()) as NightDigest;
    expect(body.night).toBe('2026-10-28');
    expect(body.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(body.badLines).toBe(1);
  });

  it('answers 404 for a night with no file', async () => {
    const res = await createApp(fixtureConfig).request('/api/digest/2001-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('answers 200 with no rows for an empty night', async () => {
    const res = await createApp(tmpConfig).request('/api/digest/2026-11-01');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ night: '2026-11-01', rows: [], badLines: 0 });
  });

  it('counts the bad line and keeps the good rows', async () => {
    const res = await createApp(tmpConfig).request('/api/digest/2026-11-02');
    expect(res.status).toBe(200);
    const body = (await res.json()) as NightDigest;
    expect(body.badLines).toBeGreaterThanOrEqual(1);
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0]).toMatchObject({ job: 'lane/sync', owner: 'rook', runs: 1, lastStatus: 'ok' });
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order for 2026-10-28', async () => {
    const app = createApp(fixtureConfig);
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as NightDigest;
    expect(pageJobs(html)).toEqual(body.rows.map((r) => r.job));
  });
});
