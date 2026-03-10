#!/usr/bin/env node
import { Args, Command, Options } from "@effect/cli";
import * as NodeContext from "@effect/platform-node/NodeContext";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import { Console, Effect } from "effect";

import { activationCommand } from "./activate.js";
import { doctorOnlyTest } from "./doctor.js";
import { initOnlyTest, installGlobalShim, installLocalShim, installOnlyTest } from "./install.js";
import { syncTestScripts } from "./package-json.js";
import { execRunner, supportedRunners } from "./runner.js";

const cwdOption = Options.text("cwd").pipe(Options.withDefault(process.cwd()));
const runnerOption = Options.choice("runner", supportedRunners).pipe(Options.withDefault("vitest"));
const locationOption = Options.choice("location", ["package-json", "file"]).pipe(
  Options.withDefault("package-json"),
);
const syncScriptsOption = Options.boolean("sync-scripts").pipe(Options.withDefault(false));
const globalShimOption = Options.boolean("global-shim").pipe(Options.withDefault(true));
const localShimOption = Options.boolean("local-shim").pipe(Options.withDefault(false));
const runnerArg = Args.text({ name: "runner" });
const passthroughArg = Args.text({ name: "arg" }).pipe(Args.repeated);

const installCommand = Command.make(
  "install",
  {
    cwd: cwdOption,
    runner: runnerOption,
    location: locationOption,
    syncScripts: syncScriptsOption,
    globalShim: globalShimOption,
    localShim: localShimOption,
  },
  ({ cwd, globalShim, localShim, location, runner, syncScripts }) =>
    Effect.promise(async () => {
      await installOnlyTest({
        cwd,
        runner,
        location,
        syncScripts,
        globalShim,
        localShim,
      });

      await Console.log(
        [
          `Configured only-test in ${cwd}`,
          `Repo policy: ${location}`,
          `Runner: ${runner}`,
          `bun test redirect: enabled`,
          `Global shim: ${globalShim ? "installed" : "skipped"}`,
          `Local shim: ${localShim ? "installed" : "skipped"}`,
          `Scripts synced: ${syncScripts ? "yes" : "no"}`,
          "",
          "Next step:",
          `eval "$(only-test activate)"`,
        ].join("\n"),
      ).pipe(Effect.runPromise);
    }),
);

const initCommand = Command.make(
  "init",
  {
    cwd: cwdOption,
    runner: runnerOption,
    location: locationOption,
  },
  ({ cwd, location, runner }) =>
    Effect.promise(() =>
      initOnlyTest({
        cwd,
        runner,
        location,
      }),
    ),
);

const globalShimCommand = Command.make("setup-shell", {}, () =>
  Effect.promise(() => installGlobalShim()),
);

const localShimCommand = Command.make(
  "install-local-shim",
  {
    cwd: cwdOption,
    runner: runnerOption,
  },
  ({ cwd }) =>
    Effect.promise(() =>
      installLocalShim({
        cwd,
      }),
    ),
);

const syncScriptsCommand = Command.make(
  "sync-scripts",
  {
    cwd: cwdOption,
  },
  ({ cwd }) => Effect.promise(() => syncTestScripts(cwd)),
);

const runCommand = Command.make(
  "run",
  {
    cwd: cwdOption,
    runner: runnerArg,
    args: passthroughArg,
  },
  ({ args, cwd, runner }) =>
    Effect.promise(async () => {
      if (!supportedRunners.includes(runner as (typeof supportedRunners)[number])) {
        throw new Error(`Unsupported runner: ${runner}`);
      }

      process.exitCode = await execRunner(cwd, runner as (typeof supportedRunners)[number], args);
    }),
);

const doctorCommand = Command.make(
  "doctor",
  {
    cwd: cwdOption,
  },
  ({ cwd }) =>
    Effect.flatMap(
      Effect.promise(() => doctorOnlyTest(cwd)),
      (lines) => Console.log(lines.join("\n")),
    ),
);

const activateCmd = Command.make("activate", {}, () => Console.log(activationCommand()));

const rootCommand = Command.make("only-test").pipe(
  Command.withSubcommands([
    installCommand,
    initCommand,
    globalShimCommand,
    localShimCommand,
    syncScriptsCommand,
    runCommand,
    doctorCommand,
    activateCmd,
  ]),
);

const cli = Command.run(rootCommand, {
  name: "only-test",
  version: "0.1.0",
});

cli(process.argv).pipe(Effect.provide(NodeContext.layer), NodeRuntime.runMain);
