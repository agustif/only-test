export type SupportedRunner = "bun-test" | "vitest" | "jest";
export type RepoConfigLocation = "package-json" | "file";

export interface RepoOnlyTestConfig {
  readonly version: 1;
  readonly runner: SupportedRunner;
}

export interface GlobalOnlyTestConfig {
  readonly version: 1;
  readonly packageRoot: string;
  readonly realBunPath: string;
}
