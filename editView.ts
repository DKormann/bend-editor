import { div, palette, pre, span } from "./ui"

type pos = {
  line: number,
  col: number,
}

export type DefinitionRequest = pos & { token: string };

export function editView(
  rows: number,
  cols: number,
  highlighter?: (lines: string[]) => number[][],
  onChange?: (lines: string[]) => void,
){

  const cursor : { start: pos, end: pos } = { start: { line: 0, col: 0 }, end: { line: 0, col: 0 } }

  function setCursor(pos: pos){
    cursor.start = { ...pos };
    cursor.end = { ...pos };
  }

  let lines: string[] = ['']
  let editable = true;
  let definitionHandler: ((request: DefinitionRequest) => void) | undefined;
  let typeHandler: ((request: DefinitionRequest, target: HTMLElement) => void) | undefined;
  let typeLeaveHandler: (() => void) | undefined;

  function definitionAt(pos: pos): DefinitionRequest | undefined {
    const line = lines[pos.line] ?? "";
    const isName = (char: string) => /[A-Za-z0-9_.$]/.test(char);
    let start = Math.min(pos.col, Math.max(0, line.length - 1));
    if (!isName(line[start] ?? "")) return undefined;
    let end = start + 1;
    while (start > 0 && isName(line[start - 1]!)) start -= 1;
    while (end < line.length && isName(line[end]!)) end += 1;
    return { line: pos.line, col: start, token: line.slice(start, end) };
  }

  function requestDefinition(pos: pos): void {
    const request = definitionAt(pos);
    if (request) definitionHandler?.(request);
  }

  function moveCursorX(delta: number){
    if (delta < 0) {
      if (cursor.start.col >  0) return setCursor({ line: cursor.start.line, col: Math.max(0, cursor.start.col + delta) })
      if (cursor.start.line == 0) return 
      return setCursor({ line: cursor.start.line - 1, col: lines[cursor.start.line - 1]!.length });
    }

    if (cursor.start.col == lines[cursor.start.line]!.length){
      if (cursor.start.line == lines.length -1) return
      return setCursor({ line: cursor.start.line + 1, col: 0 });
    }
    setCursor({ line: cursor.start.line, col: Math.min( cursor.start.col + delta, lines[cursor.start.line]!.length) });
  }

  function moveCursorY(delta: number){
    setCursor({line: Math.max(0, Math.min(lines.length - 1, cursor.start.line + delta)), col: cursor.start.col});
  }

  function deleteText(n = 1){
    insertText([''])
    if (cursor.start.col > 0) {
      lines[cursor.start.line] = lines[cursor.start.line]!.slice(0, cursor.start.col - n) + lines[cursor.start.line]!.slice(cursor.start.col);
      setCursor({ line: cursor.start.line, col: cursor.start.col - n});
    }else{
      if (cursor.start.line > 0) {
        const prevLineLength = lines[cursor.start.line - 1]!.length;
        lines[cursor.start.line - 1] += lines[cursor.start.line];
        lines.splice(cursor.start.line, 1);
        setCursor({ line: cursor.start.line - 1, col: prevLineLength });
      }
    }
    onTextChange()
  }
  

  function insertText(t: string[]){

    if (t.length == 0) throw Error("no empty insert")
    t[0] = lines[cursor.start.line]!.slice(0, cursor.start.col) + t[0];
    let cur: pos = {line: cursor.start.line + t.length - 1, col: t[t.length - 1]!.length}
    t[t.length - 1] = t[t.length - 1] + lines[cursor.start.line]!.slice(cursor.start.col);

    lines = (
      [
        ...lines.slice(0, cursor.start.line),
        ...t,
        ...lines.slice(cursor.start.line + 1),
      ]
    );
    setCursor(cur);
    onTextChange();
  }

  document.addEventListener("keydown", e=>{
    if (e.key === "F12") {
      e.preventDefault();
      requestDefinition(cursor.start);
      return;
    }
    if (!editable) return;
    if (e.key.length == 1) {
      if (e.metaKey || e.ctrlKey) return;
      insertText([e.key]);
    }
    if (e.key == "Enter" && !e.metaKey){
      insertText(['',''])
    }
    if (e.key == "Backspace"){
      deleteText( e.metaKey ? cursor.start.col : 1 );
      onTextChange()
    }

    if (e.key.startsWith("Arrow")){
      if (e.metaKey) e.preventDefault()
      if (e.key == "ArrowLeft")  moveCursorX(e.metaKey ? -Math.max(1,lines[cursor.start.line]!.length) : -1)
      if (e.key == "ArrowRight") moveCursorX(e.metaKey ? lines[cursor.start.line]!.length : 1)
      if (e.key == "ArrowUp")    moveCursorY(e.metaKey ? -cursor.start.line : -1)
      if (e.key == "ArrowDown")  moveCursorY(e.metaKey ? lines.length : 1)
      render()
    }


  })

  let main = pre().style({
    margin: "0",
    width: `${cols}ch`,
    height: `${rows}em`,
    padding: "1em",
    overflow: "auto",
  })
  main.view.onclick = (e) => {if (e.target === main.view) setCursor({ line: lines.length - 1, col: lines[lines.length - 1]!.length }); render()};
  let colorMap: number[][] = [];

  function onTextChange(){
    if (highlighter) colorMap = highlighter(lines);
    render();
    onChange?.([...lines]);
  }

  function render (){
    let lineEls = lines.map((line, no)=>{
      let chars = line.split('').concat([' ']).map((char ,col) => {
        let cidx = colorMap[no]?.[col] ?? 0;
        let color = palette.colors[cidx % palette.colors.length]
        let el = span(char).style({color})
        el.view.onclick = event => {
          setCursor({ line: no, col: col });
          if (event.metaKey || event.ctrlKey) requestDefinition({ line: no, col });
          render();
        };
        el.view.onmouseenter = () => {
          const request = definitionAt({ line: no, col });
          if (request) typeHandler?.(request, el.view);
        };
        el.view.onmouseleave = () => typeLeaveHandler?.();
        if (cursor.start.line == no && Math.min(line.length, cursor.start.col) == col)
          el.style({ background: palette.accent, width: "1ch",});
        return el
      });
      let lineEl = div( span( no.toString().padStart(3, " ") + " ").style({color: palette.hint}), ...chars)
      lineEl.view.onclick = (e) => {if (e.target === lineEl.view) setCursor({ line: no, col: line.length }); render()};
      return lineEl
    })

    main.replaceChildren(...lineEls)
  }

  insertText(["import Base", "", "def main() -> Nat:", "  0n"])

  return {
    view: main,
    setText: (text: string[])=>{
      lines = [...text];
      setCursor({ line: 0, col: 0 });
      if (highlighter) colorMap = highlighter(lines);
      render();
    },
    getText: () => [...lines],
    setEditable: (value: boolean) => {
      editable = value;
      main.style({ opacity: value ? "1" : ".85" });
    },
    setDefinitionHandler: (handler: (request: DefinitionRequest) => void) => {
      definitionHandler = handler;
    },
    setTypeHandler: (
      handler: (request: DefinitionRequest, target: HTMLElement) => void,
      leave: () => void,
    ) => {
      typeHandler = handler;
      typeLeaveHandler = leave;
    },
    goTo: (line: number, col: number) => {
      setCursor({
        line: Math.max(0, Math.min(lines.length - 1, line)),
        col: Math.max(0, col),
      });
      render();
      requestAnimationFrame(() => main.view.children.item(cursor.start.line)
        ?.scrollIntoView({ block: "center" }));
    },
  }
}
