import path from "node:path";

const build = Bun.spawn(["bun", "run", "build.ts"], {
  stdout: "inherit",
  stderr: "inherit",
});
if (await build.exited !== 0) process.exit(1);

const root = path.join(import.meta.dir, "dist");
const port = Number(Bun.env.PORT ?? 3050);

Bun.serve({
  hostname: Bun.env.HOST ?? "127.0.0.1",
  port,
  async fetch(request) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(request.url).pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }

    const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const filePath = path.resolve(root, requested);
    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      return new Response("Not found", { status: 404 });
    }

    const file = Bun.file(filePath);
    if (!await file.exists()) return new Response("Not found", { status: 404 });
    if (request.method === "HEAD") {
      return new Response(null, {
        headers: { "content-type": file.type, "content-length": String(file.size) },
      });
    }
    return new Response(file);
  },
});

console.log(`playground: http://localhost:${port}`);
