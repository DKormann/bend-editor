// bendHighlight.ts
var TEXT = 0;
var KEYWORD = 1;
var COMMENT = 2;
var LITERAL = 3;
var TYPE = 4;
var keywords = new Set([
  "as",
  "case",
  "def",
  "do",
  "exs",
  "for",
  "import",
  "is",
  "law",
  "match",
  "return",
  "type",
  "where"
]);
var typeWords = new Set([
  "Base",
  "Data",
  "Kind",
  "Quant",
  "Type"
]);
function isNameStart(char) {
  return /[A-Za-z_]/.test(char);
}
function isNameChar(char) {
  return /[A-Za-z0-9_.$E]/.test(char);
}
function paint(row, from, to, color) {
  for (let i = from;i < to; i += 1)
    row[i] = color;
}
function highlightBend(lines) {
  return lines.map((line) => {
    const colors = Array(line.length).fill(TEXT);
    let i = 0;
    while (i < line.length) {
      const char = line[i];
      if (char === "#") {
        paint(colors, i, line.length, COMMENT);
        break;
      }
      if (char === '"' || char === "'") {
        const quote = char;
        const start = i++;
        while (i < line.length) {
          if (line[i] === "\\") {
            i += 2;
          } else if (line[i++] === quote) {
            break;
          }
        }
        paint(colors, start, Math.min(i, line.length), LITERAL);
        continue;
      }
      if (/\d/.test(char)) {
        const start = i++;
        while (i < line.length && /[0-9A-Fa-f_xX.]/.test(line[i]))
          i += 1;
        if (line[i] === "n")
          i += 1;
        paint(colors, start, i, LITERAL);
        continue;
      }
      if (isNameStart(char)) {
        const start = i++;
        while (i < line.length && isNameChar(line[i]))
          i += 1;
        const word = line.slice(start, i);
        const color = keywords.has(word) ? KEYWORD : typeWords.has(word) || /^[A-Z]/.test(word) ? TYPE : TEXT;
        paint(colors, start, i, color);
        continue;
      }
      if (line.startsWith("@unsafe", i)) {
        paint(colors, i, i + 7, KEYWORD);
        i += 7;
        continue;
      }
      const operator = ["->", "==", "!=", "<&>", "&0", "&1", "&2"].find((token) => line.startsWith(token, i));
      if (operator) {
        paint(colors, i, i + operator.length, KEYWORD);
        i += operator.length;
        continue;
      }
      i += 1;
    }
    return colors;
  });
}

// ui.ts
var css = `

  @media (prefers-color-scheme: dark) {
    :root{
      --text-color: #e6d8c1;
      --background-color: #172033;
    }
  }

  :root{
    font-family: ui-monospace, Menlo, "SF Mono", Consolas, "Liberation Mono", monospace;
    color: var(--text-color);
    background: var(--background-color);
    --accent-color: #6e47cb;
    --hint-color: #f6f3ed;
    --text-color: #172033;
    --background-color: #e8e2cc;
    --color2: #74aa31;
    --color3: #9e4714;
    --color4: #09629a;

  }
`;
document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
var palette = {
  text: "var(--text-color)",
  background: "var(--background-color)",
  accent: "var(--accent-color)",
  hint: "var(--hint-color)",
  colors: [
    "var(--text-color)",
    "var(--accent-color)",
    "var(--color2)",
    "var(--color3)",
    "var(--color4)"
  ]
};
function elFromHTML(html) {
  let el = {
    view: html,
    replaceChildren: (...children) => {
      html.replaceChildren(...children.map((child) => typeof child === "string" ? child : child.view));
      return el;
    },
    append: (...children) => {
      children.forEach((child) => html.append(typeof child === "string" ? child : child.view));
      return el;
    },
    assignProperties: (props) => {
      Object.assign(html, props);
      return el;
    },
    style: (styles) => {
      Object.assign(html.style, styles);
      return el;
    }
  };
  return el;
}
function elFromTag(tagName) {
  const html = document.createElement(tagName);
  return elFromHTML(html);
}
var tagger = (tagName) => (...s) => elFromTag(tagName).append(...s);
var link = (s, href) => tagger("a")(s).style({ color: palette.text }).assignProperties({ href });
var p = tagger("p");
var span = tagger("span");
var div = tagger("div");
var pre = tagger("pre");
var h1 = tagger("h1");
var h2 = tagger("h2");
var h3 = tagger("h3");
var body = elFromHTML(document.body);
var cursor = div().style({
  background: palette.accent,
  width: ".5em",
  height: ".9em",
  margin: "0 .1em"
});
function navbar(items) {
  const entries = Object.entries(items);
  const bar = div().style({ display: "flex" });
  const page = div().style({
    padding: "0",
    margin: "0",
    border: `2px solid ${palette.hint}`
  });
  document.addEventListener("keydown", (e) => {
    if (e.key == "Enter" && e.metaKey)
      render(selection == 0 ? 1 : 0);
  });
  let selection = 0;
  function render(sel = 0) {
    selection = sel;
    bar.replaceChildren();
    entries.forEach(([name, item], i) => {
      const but = span(name).style({
        cursor: "pointer",
        padding: ".2em .7em",
        borderRadius: "6px 6px 0 0 "
      });
      if (i === selection) {
        page.replaceChildren(item());
        but.style({ background: palette.hint });
      }
      but.view.onclick = () => render(i);
      bar.append(but);
    });
  }
  const view = div().append(bar, page);
  const select = (name) => {
    const index = entries.findIndex(([entry]) => entry === name);
    if (index >= 0)
      render(index);
  };
  render();
  return Object.assign(view, { select });
}

// editView.ts
function editView(rows, cols, highlighter) {
  const cursor2 = { start: { line: 0, col: 0 }, end: { line: 0, col: 0 } };
  function setCursor(pos) {
    cursor2.start = { ...pos };
    cursor2.end = { ...pos };
  }
  let lines = [""];
  function moveCursorX(delta) {
    console.log("movex", delta);
    if (delta < 0) {
      if (cursor2.start.col > 0)
        return setCursor({ line: cursor2.start.line, col: Math.max(0, cursor2.start.col + delta) });
      if (cursor2.start.line == 0)
        return;
      return setCursor({ line: cursor2.start.line - 1, col: lines[cursor2.start.line - 1].length });
    }
    if (cursor2.start.col == lines[cursor2.start.line].length) {
      if (cursor2.start.line == lines.length - 1)
        return;
      return setCursor({ line: cursor2.start.line + 1, col: 0 });
    }
    setCursor({ line: cursor2.start.line, col: Math.min(cursor2.start.col + delta, lines[cursor2.start.line].length) });
  }
  function moveCursorY(delta) {
    setCursor({ line: Math.max(0, Math.min(lines.length - 1, cursor2.start.line + delta)), col: cursor2.start.col });
  }
  function deleteText(n = 1) {
    insertText([""]);
    if (cursor2.start.col > 0) {
      lines[cursor2.start.line] = lines[cursor2.start.line].slice(0, cursor2.start.col - n) + lines[cursor2.start.line].slice(cursor2.start.col);
      setCursor({ line: cursor2.start.line, col: cursor2.start.col - n });
    } else {
      if (cursor2.start.line > 0) {
        const prevLineLength = lines[cursor2.start.line - 1].length;
        lines[cursor2.start.line - 1] += lines[cursor2.start.line];
        lines.splice(cursor2.start.line, 1);
        setCursor({ line: cursor2.start.line - 1, col: prevLineLength });
      }
    }
    onTextChange();
  }
  function insertText(t) {
    if (t.length == 0)
      throw Error("no empty insert");
    t[0] = lines[cursor2.start.line].slice(0, cursor2.start.col) + t[0];
    let cur = { line: cursor2.start.line + t.length - 1, col: t[t.length - 1].length };
    t[t.length - 1] = t[t.length - 1] + lines[cursor2.start.line].slice(cursor2.start.col);
    lines = [
      ...lines.slice(0, cursor2.start.line),
      ...t,
      ...lines.slice(cursor2.start.line + 1)
    ];
    setCursor(cur);
    onTextChange();
  }
  document.addEventListener("keydown", (e) => {
    if (e.key.length == 1)
      insertText([e.key]);
    if (e.key == "Enter" && !e.metaKey) {
      insertText(["", ""]);
    }
    if (e.key == "Backspace") {
      deleteText(e.metaKey ? cursor2.start.col : 1);
      onTextChange();
    }
    if (e.key.startsWith("Arrow")) {
      if (e.metaKey)
        e.preventDefault();
      if (e.key == "ArrowLeft")
        moveCursorX(e.metaKey ? -Math.max(1, lines[cursor2.start.line].length) : -1);
      if (e.key == "ArrowRight")
        moveCursorX(e.metaKey ? lines[cursor2.start.line].length : 1);
      if (e.key == "ArrowUp")
        moveCursorY(e.metaKey ? cursor2.start.line : -1);
      if (e.key == "ArrowDown")
        moveCursorY(e.metaKey ? cursor2.start.line : 1);
      render();
    }
  });
  let main = pre().style({
    margin: "0",
    width: `${cols}ch`,
    height: `${rows}em`,
    padding: "1em",
    overflow: "auto"
  });
  main.view.onclick = (e) => {
    if (e.target === main.view)
      setCursor({ line: lines.length - 1, col: lines[lines.length - 1].length });
    render();
  };
  let colorMap = [];
  function onTextChange() {
    if (highlighter)
      colorMap = highlighter(lines);
    render();
  }
  function render() {
    let lineEls = lines.map((line, no) => {
      let chars = line.split("").concat([" "]).map((char, col) => {
        let cidx = colorMap[no]?.[col] ?? 0;
        let color = palette.colors[cidx % palette.colors.length];
        let el = span(char).style({ color });
        el.view.onclick = () => {
          setCursor({ line: no, col });
          render();
        };
        if (cursor2.start.line == no && Math.min(line.length, cursor2.start.col) == col)
          el.style({ background: palette.accent, width: "1ch" });
        return el;
      });
      let lineEl = div(span(no.toString().padStart(3, " ") + " ").style({ color: palette.hint }), ...chars);
      lineEl.view.onclick = (e) => {
        if (e.target === lineEl.view)
          setCursor({ line: no, col: line.length });
        render();
      };
      return lineEl;
    });
    main.replaceChildren(...lineEls);
  }
  insertText(["import Base", "", "def main() -> Nat:", "  0n"]);
  return {
    view: main,
    setText: (text) => {
      lines = text;
      render();
    },
    getText: () => lines
  };
}

// main.ts
var runInitiated = false;
var editor = editView(40, 80, (t) => {
  runInitiated = false;
  return highlightBend(t);
});
var output = pre().style({
  boxSizing: "border-box",
  margin: "0",
  minHeight: "40em",
  overflow: "auto",
  padding: "1em",
  whiteSpace: "pre-wrap"
});
var worker;
var runNumber = 0;
var timeout;
function finish(text) {
  if (timeout !== undefined)
    clearTimeout(timeout);
  timeout = undefined;
  worker?.terminate();
  worker = undefined;
  output.replaceChildren(text);
}
function run() {
  worker?.terminate();
  const id = ++runNumber;
  output.replaceChildren("Checking…");
  worker = new Worker(new URL("./bendWorker.js", import.meta.url), { type: "module" });
  worker.onmessage = (event) => {
    if (event.data.id === id)
      finish(event.data.output);
  };
  worker.onerror = (event) => finish(`Worker error: ${event.message}`);
  worker.postMessage({ id, source: editor.getText().join(`
`) });
  timeout = setTimeout(() => finish("Execution stopped after 5 seconds."), 5000);
}
var head = div(h1(link("bend2", "https://bend-lang.org/").style({ textDecoration: "none" }), cursor).style({ display: "flex", alignItems: "center" })).style({ display: "flex", alignItems: "center" });
var tabs = navbar({
  editor: () => editor.view,
  output: () => {
    if (!runInitiated) {
      output.append(p("Checking…"));
      runInitiated = true;
      run();
    }
    return output;
  },
  about: () => div(p("bend-editor is fan art for the ", link("Bend", "https://bend-lang.org/"), " programming language."), p("say hi: ", link("contact", "https://x.com/dogecahedron"))).style({ padding: "1em" })
});
body.append(head, tabs);

//# debugId=0DB1664E3174CE0E64756E2164756E21
//# sourceMappingURL=main.js.map
