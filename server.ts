const build = Bun.spawn(["bun", "run", "build.ts"], {
  stdout: "inherit",
  stderr: "inherit",
});
if (await build.exited !== 0) process.exit(1);

const port = Number(Bun.env.PORT ?? 3050);
const playgroundUrl = `http://localhost:${port}`;

Bun.serve({
  hostname: Bun.env.HOST ?? "127.0.0.1",
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/config") {
      return Response.json({ playgroundUrl });
    }

    if (request.method === "GET" && /^\/(main|bendWorker)\.js(?:\.map)?$/.test(url.pathname)) {
      const file = Bun.file(`dist/${url.pathname.slice(1)}`);
      if (!await file.exists()) return new Response("Not found", { status: 404 });
      return new Response(file, {
        headers: {
          "content-type": url.pathname.endsWith(".map")
            ? "application/json"
            : "text/javascript; charset=utf-8",
        },
      });
    }

    if (request.method === "GET") {
      return new Response(Bun.file("index.html"), {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
    return new Response("Not found", { status: 404 });
  },
});

console.log(`playground: ${playgroundUrl}`);
