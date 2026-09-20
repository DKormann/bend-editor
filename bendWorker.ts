import * as Fs from "./platform/fs";
import * as Bend from "./vendor/bend/bend2/bend";

type Document =
  | { kind: "project"; path: string }
  | { kind: "hub"; hash: string; path: string };
type RunRequest = { kind: "run"; id: number; entry: string; files: Record<string, string> };
type TypeRequest = {
  kind: "type";
  id: number;
  files: Record<string, string>;
  document: Document;
  token: string;
};
type Request = RunRequest | TypeRequest;
type Response = { kind: "run"; id: number; ok: boolean; output: string }
  | { kind: "type"; id: number; type?: string };

function showError(error: unknown): string {
  if (error instanceof RangeError) {
    return "Error: the machine stack overflowed (deep recursion or a literal that is too large).";
  }
  const bendError = error as Bend.Err;
  return bendError?.$ === "Err" ? Bend.err_show(bendError) : String(error);
}

function projectPath(path: string): string {
  if (path.startsWith("/") || path.split("/").some(part => part === "" || part === "." || part === "..")) {
    throw new Error(`Invalid project path: ${path}`);
  }
  return `/project/${path}`;
}

function mountProject(files: Record<string, string>): void {
  for (const [path, source] of Object.entries(files)) Fs.mount(projectPath(path), source);
}

async function run(entry: string, files: Record<string, string>): Promise<string> {
  if (files[entry] === undefined) throw new Error(`Missing entry file: ${entry}`);
  mountProject(files);

  const book = Bend.book_nil();
  await Bend.book_load(book, projectPath(entry), "", new Map());
  Bend.book_valid(book);

  const todos = book.hols + book.open;
  if (todos > 0) {
    throw new Error(`${todos} TODO${todos === 1 ? "" : "s"} found. The code is incomplete.`);
  }

  const unsafe = Object.entries(book.tlds).filter(([name, tld]) =>
    tld.$ === "Def" && (tld.u === true || name.includes("~"))).length;
  const checked = unsafe === 0
    ? "All terms check."
    : `All terms check, with ${unsafe} unsafe annotation${unsafe === 1 ? "" : "s"}.`;

  const main = book.tlds.main;
  if (main === undefined || main.$ !== "Def" || main.v === null) return checked;

  const value = Bend.term_snf(book, main.v);
  return checked + "\n" + Bend.term_show(Bend.term_lower(value));
}

function importsOf(source: string): Array<{ module: string; alias: string }> {
  return [...source.matchAll(/^\s*import\s+(\S+)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)/gm)]
    .map(match => ({
      module: match[1]!.replace(/^\.\//, "").replace(/\.bend$/, ""),
      alias: match[2]!,
    }));
}

function importedName(source: string, token: string): string {
  const [prefix, ...rest] = token.split(".");
  const imported = importsOf(source).find(item => item.alias === prefix);
  if (imported === undefined) return token;
  return imported.module + (rest.length === 0 ? "" : "." + rest.join("."));
}

async function typeOf(request: TypeRequest): Promise<string | undefined> {
  mountProject(request.files);
  const file = request.document.kind === "project"
    ? projectPath(request.document.path)
    : `/home/web/.bend/lib/${request.document.hash}/${request.document.path}`;
  const book = Bend.book_nil();
  await Bend.book_load(book, file, "", new Map());
  const source = Fs.readFileSync(file, "utf8");
  const name = importedName(source, request.token);
  const item = book.tlds[name] ?? book.ctrs[name];
  if (item === undefined) return undefined;
  let type = Bend.term_show(Bend.term_lower(item.T));
  for (const imported of importsOf(source)) {
    type = type.replaceAll(imported.module + ".", imported.alias + ".");
  }
  return `${request.token} : ${type}`;
}

self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  if (request.kind === "type") {
    try {
      const type = await typeOf(request);
      self.postMessage({ kind: "type", id: request.id, type } satisfies Response);
    } catch {
      self.postMessage({ kind: "type", id: request.id } satisfies Response);
    }
    return;
  }

  try {
    const output = await run(request.entry, request.files);
    self.postMessage({ kind: "run", id: request.id, ok: true, output } satisfies Response);
  } catch (error) {
    self.postMessage({ kind: "run", id: request.id, ok: false, output: showError(error) } satisfies Response);
  }
};
