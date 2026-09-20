import * as Fs from "./platform/fs";
import * as Bend from "./vendor/bend/bend2/bend";

type RunRequest = { id: number; entry: string; files: Record<string, string> };
type RunResponse = { id: number; ok: boolean; output: string };

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

async function run(entry: string, files: Record<string, string>): Promise<string> {
  if (files[entry] === undefined) throw new Error(`Missing entry file: ${entry}`);
  for (const [path, source] of Object.entries(files)) Fs.mount(projectPath(path), source);

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

self.onmessage = async (event: MessageEvent<RunRequest>) => {
  const { id, entry, files } = event.data;
  try {
    const output = await run(entry, files);
    self.postMessage({ id, ok: true, output } satisfies RunResponse);
  } catch (error) {
    self.postMessage({ id, ok: false, output: showError(error) } satisfies RunResponse);
  }
};
