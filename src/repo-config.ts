import { constants } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { dirname } from "node:path";

import { writeText } from "./fs.js";
import { packageJsonPath, repoConfigFilePath } from "./paths.js";
import type { RepoConfigLocation, RepoOnlyTestConfig, SupportedRunner } from "./types.js";

interface PackageJsonShape {
  readonly onlyTest?: RepoOnlyTestConfig;
  readonly scripts?: Record<string, string>;
  readonly [key: string]: unknown;
}

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const makeRepoConfig = (runner: SupportedRunner): RepoOnlyTestConfig => ({
  version: 1,
  runner,
});

export const writeRepoConfig = async (input: {
  readonly cwd: string;
  readonly runner: SupportedRunner;
  readonly location: RepoConfigLocation;
}): Promise<RepoOnlyTestConfig> => {
  const config = makeRepoConfig(input.runner);

  if (input.location === "file") {
    await writeText(repoConfigFilePath(input.cwd), `${JSON.stringify(config, null, 2)}\n`);
    return config;
  }

  const path = packageJsonPath(input.cwd);
  const current = JSON.parse(await readFile(path, "utf8")) as PackageJsonShape;

  await writeText(
    path,
    `${JSON.stringify(
      {
        ...current,
        onlyTest: config,
      },
      null,
      2,
    )}\n`,
  );

  return config;
};

export const readRepoConfigAt = async (cwd: string): Promise<RepoOnlyTestConfig | undefined> => {
  if (await exists(repoConfigFilePath(cwd))) {
    return JSON.parse(await readFile(repoConfigFilePath(cwd), "utf8")) as RepoOnlyTestConfig;
  }
  if (!(await exists(packageJsonPath(cwd)))) {
    return undefined;
  }
  const current = JSON.parse(await readFile(packageJsonPath(cwd), "utf8")) as PackageJsonShape;
  return current.onlyTest;
};

export const findNearestRepoConfig = async (
  startCwd: string,
): Promise<{ root: string; config: RepoOnlyTestConfig } | undefined> => {
  let current = startCwd;

  while (true) {
    const config = await readRepoConfigAt(current);
    if (config) {
      return { root: current, config };
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }
};
