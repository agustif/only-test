import { ensureDir, makeExecutable, writeText } from "./fs.js";
import {
  globalOnlyTestActivatePath,
  globalOnlyTestBinDir,
  globalOnlyTestBunShimPath,
  globalOnlyTestConfigPath,
  localOnlyTestActivatePath,
  localOnlyTestBinDir,
  localOnlyTestBunShimPath,
  localOnlyTestConfigPath,
} from "./paths.js";
import type { GlobalOnlyTestConfig } from "./types.js";

const globalConfigContent = (config: GlobalOnlyTestConfig): string =>
  `${JSON.stringify(config, null, 2)}\n`;

const activationScriptContent = (binDir: string): string =>
  `#!/usr/bin/env bash
set -euo pipefail
export PATH="${binDir}:$PATH"
`;

const shimScriptContent = (input: {
  readonly packageRoot: string;
  readonly realBunPath: string;
  readonly configPath: string;
}): string =>
  `#!/usr/bin/env bash
set -euo pipefail

REAL_BUN=${JSON.stringify(input.realBunPath)}
PACKAGE_ROOT=${JSON.stringify(input.packageRoot)}
CONFIG_PATH=${JSON.stringify(input.configPath)}

if [[ "\${ONLY_TEST_DISABLE_SHIM:-}" == "1" ]]; then
  exec "$REAL_BUN" "$@"
fi

exec node "$PACKAGE_ROOT/dist/shim-entry.js" \
  --real-bun "$REAL_BUN" \
  --config-path "$CONFIG_PATH" \
  --cwd "$PWD" \
  -- "$@"
`;

export const writeGlobalOnlyTestArtifacts = async (input: {
  readonly homeDir: string;
  readonly config: GlobalOnlyTestConfig;
}): Promise<void> => {
  const binDir = globalOnlyTestBinDir(input.homeDir);
  await ensureDir(binDir);
  await writeText(globalOnlyTestConfigPath(input.homeDir), globalConfigContent(input.config));
  await writeText(globalOnlyTestActivatePath(input.homeDir), activationScriptContent(binDir));
  await makeExecutable(globalOnlyTestActivatePath(input.homeDir));
  await writeText(
    globalOnlyTestBunShimPath(input.homeDir),
    shimScriptContent({
      packageRoot: input.config.packageRoot,
      realBunPath: input.config.realBunPath,
      configPath: globalOnlyTestConfigPath(input.homeDir),
    }),
  );
  await makeExecutable(globalOnlyTestBunShimPath(input.homeDir));
};

export const writeLocalOnlyTestArtifacts = async (input: {
  readonly cwd: string;
  readonly realBunPath: string;
  readonly packageRoot: string;
}): Promise<void> => {
  const binDir = localOnlyTestBinDir(input.cwd);
  await ensureDir(binDir);
  await writeText(
    localOnlyTestConfigPath(input.cwd),
    `${JSON.stringify(
      {
        version: 1,
        packageRoot: input.packageRoot,
        realBunPath: input.realBunPath,
      },
      null,
      2,
    )}\n`,
  );
  await writeText(localOnlyTestActivatePath(input.cwd), activationScriptContent(binDir));
  await makeExecutable(localOnlyTestActivatePath(input.cwd));
  await writeText(
    localOnlyTestBunShimPath(input.cwd),
    shimScriptContent({
      packageRoot: input.packageRoot,
      realBunPath: input.realBunPath,
      configPath: localOnlyTestConfigPath(input.cwd),
    }),
  );
  await makeExecutable(localOnlyTestBunShimPath(input.cwd));
};
