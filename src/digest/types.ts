// Plan morning-digest § 1. The contract every part of the digest builds against.
export type JobStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. `first` and `last` keep the offset from the log.
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as —
  runs: number; // every line for the job
  retries: number; // lines with status retry
  lastStatus: JobStatus; // from the latest line by `at`
  lastError: string | null; // error of that latest line, if any
  first: string;
  last: string;
};

export type NightDigest = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that didn't parse, counted and never thrown
};

// null when the night has no file (or the name isn't YYYY-MM-DD): the routes answer 404.
// An empty file is not null: it gives rows: [].
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
