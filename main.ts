import { highlightBend } from "./bendHighlight";
import { editView } from "./editView";
import { body, cursor, div, elFromTag, h1, link, navbar, p, palette, pre } from "./ui";

const editor = editView(40, 80, highlightBend);
const output = pre().style({
  boxSizing: "border-box",
  margin: "0",
  minHeight: "40em",
  overflow: "auto",
  padding: "1em",
  whiteSpace: "pre-wrap",
});

let worker: Worker | undefined;
let runNumber = 0;
let timeout: ReturnType<typeof setTimeout> | undefined;

function finish(text: string): void {
  if (timeout !== undefined) clearTimeout(timeout);
  timeout = undefined;
  worker?.terminate();
  worker = undefined;
  output.replaceChildren(text);
}

function run(): void {
  worker?.terminate();
  const id = ++runNumber;
  output.replaceChildren("Checking…");

  worker = new Worker(new URL("./bendWorker.js", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent<{ id: number; output: string }>) => {
    if (event.data.id === id) finish(event.data.output);
  };
  worker.onerror = event => finish(`Worker error: ${event.message}`);
  worker.postMessage({ id, source: editor.getText().join("\n") });

  timeout = setTimeout(() => finish("Execution stopped after 5 seconds."), 5000);
}


const head = div(
  h1(link("bend2", "https://bend-lang.org/").style({ textDecoration: "none" }), cursor)
  .style({ display: "flex", alignItems: "center" }),
).style({display: "flex", alignItems: "center"});

const tabs = navbar({
  editor: ()=> editor.view,
  output: ()=> {
    output.append("Checking…");
    run();
    return output;
  },
  about: ()=>div(
    p("bend-editor is fan art for the ", link("Bend", "https://bend-lang.org/"), " programming language."),
    p("say hi: ", link("contact", "https://x.com/dogecahedron")),
  ).style({ padding: "1em" }),
});

body.append(head, tabs);
