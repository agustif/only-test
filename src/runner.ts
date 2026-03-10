import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { delimiter } from "node:path";

import type { SupportedRunner } from "./types.js";

interface RunnerAdapter {
  readonly binaryCandidates: ReadonlyArray<string>;
  readonly syncedScript: string;
  readonly resolveCommand: (
    cwd: string,
    args: ReadonlyArray<string>,
    realBunPath?: string,
  ) => Promise<{ command: string; args: ReadonlyArray<string> }>;
}

const pathEntries = (cwd: string): ReadonlyArray<string> =>
  [`${cwd}/node_modules/.bin`, ...(process.env.PATH?.split(delimiter) ?? [])].filter(
    (entry) => entry.length > 0,
  );

const isExecutable = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

const resolveBinary = async (cwd: string, candidates: ReadonlyArray<string>): Promise<string> => {
  for (const entry of pathEntries(cwd)) {
    for (const candidate of candidates) {
      const fullPath = `${entry}/${candidate}`;
      if (await isExecutable(fullPath)) {
        return fullPath;
      }
    }
  }

  throw new Error(
    `Unable to locate one of [${candidates.join(", ")}] in ${cwd}/node_modules/.bin or PATH`,
  );
};

const runnerAdapters: Record<SupportedRunner, RunnerAdapter> = {
  "bun-test": {
    binaryCandidates: ["bun"],
    syncedScript: "only-test run bun-test",
    resolveCommand: async (_cwd, args, realBunPath) => {
      if (typeof realBunPath !== "string" || realBunPath.length === 0) {
        throw new Error("bun-test runner requires a resolved bun binary");
      }

      return {
        command: realBunPath,
        args: ["test", ...args],
      };
    },
  },
  vitest: {
    binaryCandidates: ["vitest"],
    syncedScript: "only-test run vitest",
    resolveCommand: async (cwd, args) => ({
      command: await resolveBinary(cwd, ["vitest"]),
      args,
    }),
  },
  jest: {
    binaryCandidates: ["jest"],
    syncedScript: "only-test run jest",
    resolveCommand: async (cwd, args) => ({
      command: await resolveBinary(cwd, ["jest"]),
      args,
    }),
  },
};

export const supportedRunners = Object.freeze(
  Object.keys(runnerAdapters) as ReadonlyArray<SupportedRunner>,
);

export const syncedScriptForRunner = (runner: SupportedRunner): string =>
  runnerAdapters[runner].syncedScript;

export const resolveRunnerCommand = async (
  cwd: string,
  runner: SupportedRunner,
  args: ReadonlyArray<string>,
  realBunPath?: string,
): Promise<{ command: string; args: ReadonlyArray<string> }> =>
  await runnerAdapters[runner].resolveCommand(cwd, args, realBunPath);

export const execRunner = async (
  cwd: string,
  runner: SupportedRunner,
  args: ReadonlyArray<string>,
  realBunPath?: string,
): Promise<number> => {
  const resolved = await resolveRunnerCommand(cwd, runner, args, realBunPath);

  return await new Promise<number>((resolve, reject) => {
    const child = spawn(resolved.command, [...resolved.args], {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        ONLY_TEST_RUNNER: runner,
        ONLY_TEST_DISABLE_SHIM: "1",
      },
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
};
