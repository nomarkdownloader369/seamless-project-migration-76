/** Prevent older catalog reads from overwriting a later read or successful write. */
export function createRequestGate() {
  let version = 0;
  let writes = 0;
  return {
    begin: () => ++version,
    invalidate: () => { version++; },
    startWrite: () => { writes++; version++; },
    finishWrite: () => { writes = Math.max(0, writes - 1); version++; },
    isWriting: () => writes > 0,
    isCurrent: (request: number) => writes === 0 && request === version,
  };
}