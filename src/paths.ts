import { dirname, resolve } from "node:path";

export const packageJsonPath = (cwd: string): string => resolve(cwd, "package.json");
export const repoConfigFilePath = (cwd: string): string => resolve(cwd, "only-test.json");

export const globalOnlyTestDir = (homeDir: string): string =>
  resolve(homeDir, ".local", "share", "only-test");
export const globalOnlyTestBinDir = (homeDir: string): string =>
  resolve(globalOnlyTestDir(homeDir), "bin");
export const globalOnlyTestConfigPath = (homeDir: string): string =>
  resolve(globalOnlyTestDir(homeDir), "config.json");
export const globalOnlyTestBunShimPath = (homeDir: string): string =>
  resolve(globalOnlyTestBinDir(homeDir), "bun");
export const globalOnlyTestActivatePath = (homeDir: string): string =>
  resolve(globalOnlyTestDir(homeDir), "activate.sh");

export const localOnlyTestDir = (cwd: string): string => resolve(cwd, ".only-test");
export const localOnlyTestBinDir = (cwd: string): string => resolve(localOnlyTestDir(cwd), "bin");
export const localOnlyTestConfigPath = (cwd: string): string =>
  resolve(localOnlyTestDir(cwd), "config.json");
export const localOnlyTestActivatePath = (cwd: string): string =>
  resolve(localOnlyTestDir(cwd), "activate.sh");
export const localOnlyTestBunShimPath = (cwd: string): string =>
  resolve(localOnlyTestBinDir(cwd), "bun");

export const parentDir = (path: string): string => dirname(path);
