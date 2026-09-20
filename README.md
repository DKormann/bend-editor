# bend-editor

An experimental browser editor for [Bend](https://bend-lang.org/).

## Run locally

[Bun](https://bun.sh/) is the only required build tool. Initialize the pinned
Bend compiler and start the local static server:

```sh
git submodule update --init --recursive
bun run dev
```

Open <http://localhost:3050>, edit the program, press **Run**, and select the
**output** tab.

## Static build

```sh
bun run build
```

This creates a self-contained site in `dist/`. It has no server-side API and
uses relative asset URLs, so `dist/` can be served from any static host or from
a subdirectory such as `https://USER.github.io/REPOSITORY/`.

## Deploy to GitHub Pages

The workflow in `.github/workflows/pages.yml` builds and deploys the site on
every push to `main`. In the repository's **Settings → Pages**, set **Source**
to **GitHub Actions**. The workflow checks out the Bend submodule, so no built
assets need to be prepared manually.

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

The editor supports mouse and Shift-arrow text selection, Select All, copy,
cut, and multiline paste. Command/Ctrl + `/` toggles Bend `#` comments on the
current line or every selected nonempty line. These also work for read-only
Bend Hub previews (copy only). Hover a known name to preview its Bend type. This includes
top-level functions, datatypes, constructors, Base names, local imports, and
Bend Hub imports. Command/Ctrl-click a name (or press F12 with the cursor on
it) to jump to its definition.

Foreign effects, browser `IO`, package publishing, and JavaScript code
generation are not wired up yet.
