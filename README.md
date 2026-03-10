# `only-test`

`only-test` enforces an approved test runner for a repository and silently redirects bare `bun test` to that runner.

This package exists because `bun test` is a native Bun subcommand and bypasses `package.json` scripts. Script-only enforcement is not enough if you want a consistent team policy.

`only-test` solves that with:

- minimal repo policy
- a global Bun shim by default
- optional script syncing
- optional repo-local shim for hermetic or CI-specific setups

Supported runners in this release:

- `bun-test`
- `vitest`
- `jest`

The npm package name is scoped as `@agustif/only-test` because the unscoped `only-test` name is already taken. The CLI binary is still named `only-test`.

## Install

```bash
bun add -d @agustif/only-test
```

## Recommended setup

Inside the target repo:

```bash
only-test install --runner vitest --sync-scripts
eval "$(only-test activate)"
```

This:

1. writes repo policy into `package.json#onlyTest` by default
2. installs a machine-level Bun shim under `~/.local/share/only-test/bin/bun`
3. optionally syncs `package.json` test scripts to `only-test run vitest`

After activation:

- `bun test` is silently redirected to the approved runner
- `bun run test` continues to use repo scripts
- `npm test` and `pnpm test` can be synced to the same policy

## Repo policy

Default location:

```json
{
  "onlyTest": {
    "version": 1,
    "runner": "vitest"
  }
}
```

Alternative file-based location:

```json
{
  "version": 1,
  "runner": "vitest"
}
```

saved as `only-test.json`

## Commands

### `only-test install`

```bash
only-test install --runner vitest --sync-scripts
```

Options:

- `--cwd <dir>`: target repo directory, defaults to current working directory
- `--runner bun-test|vitest|jest`
- `--location package-json|file`: where to store repo policy
- `--sync-scripts`: rewrite `package.json` test scripts to `only-test run <runner>`
- `--global-shim`: install the global Bun shim, enabled by default
- `--local-shim`: additionally install a repo-local shim

### `only-test init`

```bash
only-test init --runner jest
```

Writes repo policy only. No scripts, no shims.

### `only-test setup-shell`

```bash
only-test setup-shell
```

Installs the global Bun shim under `~/.local/share/only-test/`.

### `only-test install-local-shim`

```bash
only-test install-local-shim --cwd .
```

Writes a repo-local shim under `.only-test/` for hermetic setups.

### `only-test sync-scripts`

```bash
only-test sync-scripts
```

Reads repo policy and rewrites:

- `scripts.test`
- `scripts["test:doctor"]`

### `only-test run`

```bash
only-test run vitest -- --watch
only-test run jest -- --runInBand
only-test run bun-test -- some.test.ts
```

This resolves the configured local binary and executes it directly.

### `only-test doctor`

```bash
only-test doctor
```

Reports:

- repo policy presence
- global shim presence
- activation script presence
- whether test scripts are synced
- whether the global shim dir is on `PATH`

### `only-test activate`

```bash
eval "$(only-test activate)"
```

Prints the shell command that prepends the global shim dir to `PATH`.

## Behavior

With repo policy + global activation:

- if repo policy is `vitest`, `bun test` becomes `vitest`
- if repo policy is `jest`, `bun test` becomes `jest`
- if repo policy is `bun-test`, `bun test` remains `bun test`

That last case is useful if a team wants explicit policy while still using Bun’s own runner.

## Release model

This repo ships:

- CI on pushes and pull requests
- GitHub Pages for a simple landing/install page
- a tag-based release workflow

Tagging `v0.1.0` or similar will:

1. install dependencies with Bun
2. lint, typecheck, test, and build
3. create a tarball with `npm pack`
4. publish a GitHub Release with the tarball attached

## Limitations

- It cannot affect bare `bun test` without a PATH-level shim.
- It does not patch Bun internals.
- It enforces one approved runner path per repo.
- Runners are adapter-based, not arbitrary shell commands.

## Local development

```bash
bun install
bun run lint
bun run check
bun run test
bun run build
node dist/cli.js --help
```
