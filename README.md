# bend-editor

An experimental browser editor for [Bend](https://bend-lang.org/).

## Run locally

```sh
git submodule update --init --recursive
bun server.ts
```

Open <http://localhost:3050>, edit the program, press **Run**, and select the
**output** tab.

## Browser integration

The editor bundles Bend's TypeScript checker and evaluator into a Web Worker.
The upstream compiler is pinned as a Git submodule in `vendor/bend` and is not
modified. `build.ts` aliases the compiler's small `node:*` surface to the
browser adapters in `platform/`; `platform/fs.ts` provides an in-memory virtual
filesystem containing `base.bend` and the current editor source.

Runs use a fresh worker with a five-second timeout. Projects support multiple
local `.bend` files and are saved in local storage. The explorer reads Bend
Hub's public package index, previews immutable Hub files, and can insert a
content-addressed package import into the entry file. Bend's own loader fetches
and cryptographically verifies imported Hub packages inside the worker.

Foreign effects, browser `IO`, package publishing, and JavaScript code
generation are not wired up yet.
