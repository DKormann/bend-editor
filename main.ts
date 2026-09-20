import { highlightBend } from "./bendHighlight";
import { editView } from "./editView";
import { body, cursor, div, elFromTag, h1, link, niceList, navbar, p, palette, pre } from "./ui";


let runInitiated = false;

const editor = editView(40, 80, (t)=>{
  runInitiated = false
  return highlightBend(t)
});

const output = pre().style({
  boxSizing: "border-box",
  margin: "0",
  // minHeight: "40em",
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

let files = {
  "main.bend": editor.getText().join("\n"),
  "foo.bend": `def foo() -> Nat: 22n`
}



const tabs = navbar({
  explorer(){
    return niceList(
      Object.entries(files).map(([name, content]) => div(name))
    );
  },
  editor: ()=> editor.view,
  output: ()=> {
    if (!runInitiated){
      output.append(p("Checking…"));
      runInitiated = true;
      run();
    }
    return output;
  },
  about: ()=>div(
    p("bend-editor is fan art for the ", link("Bend", "https://bend-lang.org/"), " programming language."),
    p("say hi: ", link("contact", "https://x.com/dogecahedron")),
  ).style({ padding: "1em" }),
});

body.append(head, tabs);
