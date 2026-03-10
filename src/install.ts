import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { syncTestScripts } from "./package-json.js";
import { writeRepoConfig } from "./repo-config.js";
import { resolveRealBunPath } from "./resolve-bun.js";
import { writeGlobalOnlyTestArtifacts, writeLocalOnlyTestArtifacts } from "./shim.js";
import type { RepoConfigLocation, SupportedRunner } from "./types.js";

const packageRoot = (): string => resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const initOnlyTest = async (input: {
  readonly cwd: string;
  readonly runner: SupportedRunner;
  readonly location: RepoConfigLocation;
}): Promise<void> => {
  await writeRepoConfig(input);
};

export const installGlobalShim = async (homeDir = homedir()): Promise<void> => {
  await writeGlobalOnlyTestArtifacts({
    homeDir,
    config: {
      version: 1,
      packageRoot: packageRoot(),
      realBunPath: await resolveRealBunPath(),
    },
  });
};

export const installLocalShim = async (input: { readonly cwd: string }): Promise<void> => {
  await writeLocalOnlyTestArtifacts({
    cwd: input.cwd,
    realBunPath: await resolveRealBunPath(),
    packageRoot: packageRoot(),
  });
};

export const installOnlyTest = async (input: {
  readonly cwd: string;
  readonly runner: SupportedRunner;
  readonly location: RepoConfigLocation;
  readonly syncScripts: boolean;
  readonly globalShim: boolean;
  readonly localShim: boolean;
  readonly homeDir?: string;
}): Promise<void> => {
  await initOnlyTest({
    cwd: input.cwd,
    runner: input.runner,
    location: input.location,
  });

  if (input.syncScripts) {
    await syncTestScripts(input.cwd, input.runner);
  }
  if (input.globalShim) {
    await installGlobalShim(input.homeDir ?? homedir());
  }
  if (input.localShim) {
    await installLocalShim({ cwd: input.cwd });
  }
};
