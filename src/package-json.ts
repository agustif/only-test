import { readText, writeText } from "./fs.js";
import { packageJsonPath } from "./paths.js";
import { readRepoConfigAt } from "./repo-config.js";
import { syncedScriptForRunner } from "./runner.js";
import type { SupportedRunner } from "./types.js";

interface PackageJsonShape {
  readonly name?: string;
  readonly scripts?: Record<string, string>;
  readonly [key: string]: unknown;
}

const writePackageJson = async (
  cwd: string,
  updater: (current: PackageJsonShape) => PackageJsonShape,
): Promise<void> => {
  const path = packageJsonPath(cwd);
  const current = JSON.parse(await readText(path)) as PackageJsonShape;

  await writeText(path, `${JSON.stringify(updater(current), null, 2)}\n`);
};

export const syncTestScripts = async (cwd: string, runner?: SupportedRunner): Promise<void> => {
  const resolvedRunner = runner ?? (await readRepoConfigAt(cwd))?.runner;
  if (!resolvedRunner) {
    throw new Error("Unable to sync scripts without an only-test repo policy");
  }

  await writePackageJson(cwd, (current) => ({
    ...current,
    scripts: {
      ...(current.scripts ?? {}),
      test: syncedScriptForRunner(resolvedRunner),
      "test:doctor": "only-test doctor",
    },
  }));
};
