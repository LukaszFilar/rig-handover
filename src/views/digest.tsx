import type { DigestRow, NightDigest } from '../digest/types.js';

const MISSING = '—';

// retries >= 3 or a latest status of fail: the row is marked, with text as well as colour.
function flags(row: DigestRow): { retries: boolean; fail: boolean } {
  return { retries: row.retries >= 3, fail: row.lastStatus === 'fail' };
}

function DigestRowView({ row }: { row: DigestRow }) {
  const f = flags(row);
  const cls = f.retries || f.fail ? 'warn' : undefined;
  return (
    <tr>
      <td class={cls}>{row.job}</td>
      <td class={cls}>{row.owner ?? MISSING}</td>
      <td class={cls}>{row.runs}</td>
      <td class={cls}>
        {row.retries}
        {f.retries ? ' · retries ≥ 3' : ''}
      </td>
      <td class={cls}>{row.lastStatus}</td>
      <td class={cls}>{row.lastError ?? MISSING}</td>
      <td class={cls}>{row.first}</td>
      <td class={cls}>{row.last}</td>
    </tr>
  );
}

export function DigestView({ digest }: { digest: NightDigest }) {
  return (
    <>
      <h1>digest {digest.night}</h1>
      {digest.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {digest.rows.map((row) => (
              <DigestRowView row={row} />
            ))}
          </tbody>
        </table>
      )}
      {digest.badLines > 0 ? (
        <p class="mute">
          {digest.badLines === 1 ? '1 line' : `${digest.badLines} lines`} could not be read
        </p>
      ) : null}
    </>
  );
}
