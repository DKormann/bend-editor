import { rm } from "node:fs/promises";
import path from "node:path";

const root = import.meta.dir;
const outdir = path.join(root, "dist");

// Keep the deployment directory reproducible: everything required by the
// application is emitted or copied here by this script.
await rm(outdir, { recursive: true, force: true });
const aliases: Record<string, string> = {
  "node:fs": path.join(root, "platform/fs.ts"),
  "node:os": path.join(root, "platform/os.ts"),
  "node:path": path.join(root, "platform/path.ts"),
  "node:url": path.join(root, "platform/url.ts"),
};

const result = await Bun.build({
  entrypoints: [path.join(root, "main.ts"), path.join(root, "bendWorker.ts")],
  outdir,
  target: "browser",
  format: "esm",
  sourcemap: "linked",
  plugins: [{
    name: "bend-browser-platform",
    setup(build) {
      build.onResolve({ filter: /^node:/ }, args => {
        const target = aliases[args.path];
        if (target === undefined) throw new Error(`No browser alias for ${args.path}`);
        return { path: target };
      });
      build.onLoad({ filter: /\.bend$/ }, async args => ({
        contents: await Bun.file(args.path).text(),
        loader: "text",
      }));
    },
  }],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await Bun.write(path.join(outdir, "index.html"), Bun.file(path.join(root, "index.html")));
// Prevent GitHub Pages from applying Jekyll processing to the build output.
await Bun.write(path.join(outdir, ".nojekyll"), "");

for (const output of result.outputs) {
  console.log(`${path.relative(root, output.path)} ${(output.size / 1024).toFixed(1)} KB`);
}
