import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { installOnlyTest } from "../src/install.js";
import { globalOnlyTestBunShimPath, packageJsonPath } from "../src/paths.js";

let tempDir = "";
const originalPath = process.env.PATH ?? "";

afterEach(async () => {
  process.env.PATH = originalPath;
  if (tempDir.length > 0) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = "";
  }
});

describe("installOnlyTest", () => {
  it("writes minimal repo policy by default and installs the global shim", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "only-test-install-"));
    const homeDir = join(tempDir, "home");
    await mkdir(homeDir, { recursive: true });
    await writeFile(
      packageJsonPath(tempDir),
      JSON.stringify(
        {
          name: "fixture",
          scripts: {
            test: "vitest",
          },
        },
        null,
        2,
      ),
    );

    const fakeBunDir = join(tempDir, "fake-bin");
    const fakeBun = join(fakeBunDir, "bun");
    await mkdir(fakeBunDir, { recursive: true });
    await writeFile(fakeBun, "#!/usr/bin/env bash\nexit 0\n");
    await chmod(fakeBun, 0o755);
    process.env.PATH = `${fakeBunDir}:${originalPath}`;

    await installOnlyTest({
      cwd: tempDir,
      runner: "vitest",
      location: "package-json",
      syncScripts: false,
      globalShim: true,
      localShim: false,
      homeDir,
    });

    const packageJson = JSON.parse(await readFile(packageJsonPath(tempDir), "utf8")) as {
      readonly onlyTest?: {
        readonly runner: string;
      };
      readonly scripts?: Record<string, string>;
    };

    expect(packageJson.onlyTest?.runner).toBe("vitest");
    expect(packageJson.scripts?.test).toBe("vitest");
    expect(await readFile(globalOnlyTestBunShimPath(homeDir), "utf8")).toContain(
      "dist/shim-entry.js",
    );
  });
});
