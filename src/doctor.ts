import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter } from "node:path";

import { readText } from "./fs.js";
import {
  globalOnlyTestActivatePath,
  globalOnlyTestBunShimPath,
  globalOnlyTestConfigPath,
  packageJsonPath,
  repoConfigFilePath,
} from "./paths.js";
import { findNearestRepoConfig } from "./repo-config.js";
import { syncedScriptForRunner } from "./runner.js";

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

export const doctorOnlyTest = async (cwd: string): Promise<ReadonlyArray<string>> => {
  const lines: Array<string> = [];
  const repoConfig = await findNearestRepoConfig(cwd);
  const home = homedir();

  lines.push(repoConfig ? `repo config: ok (${repoConfig.root})` : "repo config: missing");
  lines.push(
    (await exists(repoConfigFilePath(cwd))) ? "only-test.json: present" : "only-test.json: absent",
  );
  lines.push(
    (await exists(packageJsonPath(cwd))) ? "package.json: present" : "package.json: missing",
  );
  lines.push(
    (await exists(globalOnlyTestConfigPath(home)))
      ? "global shim config: ok"
      : "global shim config: missing",
  );
  lines.push(
    (await exists(globalOnlyTestBunShimPath(home)))
      ? "global bun shim: ok"
      : "global bun shim: missing",
  );
  lines.push(
    (await exists(globalOnlyTestActivatePath(home)))
      ? "global activate script: ok"
      : "global activate script: missing",
  );

  const pathEntries = process.env.PATH?.split(delimiter) ?? [];
  lines.push(
    pathEntries.includes(`${home}/.local/share/only-test/bin`)
      ? "PATH activation: ok"
      : "PATH activation: missing",
  );

  if (await exists(packageJsonPath(cwd))) {
    const packageJson = JSON.parse(await readText(packageJsonPath(cwd))) as {
      readonly scripts?: Record<string, string>;
    };
    const expectedScript = repoConfig ? syncedScriptForRunner(repoConfig.config.runner) : undefined;
    lines.push(
      expectedScript && packageJson.scripts?.test === expectedScript
        ? "package.json test script: synced"
        : "package.json test script: untouched",
    );
  }

  return lines;
};
