import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { delimiter } from "node:path";

const pathCandidates = (): ReadonlyArray<string> =>
  (process.env.PATH?.split(delimiter) ?? [])
    .map((entry) => `${entry}/bun`)
    .filter((entry) => entry.length > 0);

export const resolveRealBunPath = async (): Promise<string> => {
  for (const candidate of pathCandidates()) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {}
  }

  throw new Error("Unable to find a real bun binary on PATH");
};
