#!/usr/bin/env node
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findNearestRepoConfig } from "./repo-config.js";
import { resolveRunnerCommand } from "./runner.js";

interface ParsedShimArgs {
  readonly realBunPath: string;
  readonly configPath: string;
  readonly cwd: string;
  readonly bunArgs: ReadonlyArray<string>;
}

export type ShimPlan =
  | {
      readonly type: "passthrough";
      readonly command: string;
      readonly cwd: string;
      readonly args: ReadonlyArray<string>;
    }
  | {
      readonly type: "rewrite";
      readonly command: string;
      readonly cwd: string;
      readonly args: ReadonlyArray<string>;
    };

const parseArgs = (argv: ReadonlyArray<string>): ParsedShimArgs => {
  let realBunPath = "";
  let configPath = "";
  let cwd = process.cwd();
  const bunArgs: Array<string> = [];

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--") {
      bunArgs.push(...argv.slice(index + 1));
      break;
    }
    if (current === "--real-bun") {
      realBunPath = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (current === "--config-path") {
      configPath = argv[index + 1] ?? "";
      index += 1;
      continue;
    }
    if (current === "--cwd") {
      cwd = argv[index + 1] ?? cwd;
      index += 1;
    }
  }

  if (realBunPath.length === 0) {
    throw new Error("Missing --real-bun");
  }

  return { realBunPath, configPath, cwd, bunArgs };
};

const readShimConfig = async (configPath: string): Promise<{ readonly realBunPath?: string }> => {
  if (configPath.length === 0) {
    return {};
  }
  return JSON.parse(await readFile(configPath, "utf8")) as {
    readonly realBunPath?: string;
  };
};

export const createShimPlan = async (input: ParsedShimArgs): Promise<ShimPlan> => {
  const shimConfig = await readShimConfig(input.configPath);
  const resolvedRealBun = shimConfig.realBunPath ?? input.realBunPath;
  const repoConfig = await findNearestRepoConfig(input.cwd);

  if (repoConfig === undefined || input.bunArgs[0] !== "test") {
    return {
      type: "passthrough",
      command: resolvedRealBun,
      cwd: input.cwd,
      args: input.bunArgs,
    };
  }

  return {
    type: "rewrite",
    cwd: repoConfig.root,
    ...(await resolveRunnerCommand(
      repoConfig.root,
      repoConfig.config.runner,
      input.bunArgs.slice(1),
      resolvedRealBun,
    )),
  };
};

const run = async (command: string, args: ReadonlyArray<string>, cwd: string): Promise<number> =>
  await new Promise<number>((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        ONLY_TEST_DISABLE_SHIM: "1",
      },
    });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });

const main = async (): Promise<number> => {
  const plan = await createShimPlan(parseArgs(process.argv.slice(2)));
  return await run(plan.command, plan.args, plan.cwd);
};

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  void main().then((code) => {
    process.exitCode = code;
  });
}
