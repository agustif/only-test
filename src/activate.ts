import { homedir } from "node:os";

import { globalOnlyTestBinDir } from "./paths.js";

export const activationCommand = (): string =>
  `export PATH="${globalOnlyTestBinDir(homedir())}:$PATH"`;
