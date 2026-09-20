import * as Fs from "./platform/fs";
import * as Bend from "./vendor/bend/bend2/bend";

type RunRequest = { id: number; source: string };
type RunResponse = { id: number; ok: boolean; output: string };

const MAIN_FILE = "/project/main.bend";

function showError(error: unknown): string {
  if (error instanceof RangeError) {
    return "Error: the machine stack overflowed (deep recursion or a literal that is too large).";
  }
  const bendError = error as Bend.Err;
  return bendError?.$ === "Err" ? Bend.err_show(bendError) : String(error);
}

async function run(source: string): Promise<string> {
  Fs.mount(MAIN_FILE, source);

  const book = Bend.book_nil();
  await Bend.book_load(book, MAIN_FILE, "", new Map());
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
  const { id, source } = event.data;
  try {
    const output = await run(source);
    self.postMessage({ id, ok: true, output } satisfies RunResponse);
  } catch (error) {
    self.postMessage({ id, ok: false, output: showError(error) } satisfies RunResponse);
  }
};
