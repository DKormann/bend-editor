import { div, palette, pre, span } from "./ui"

type pos = {
  line: number,
  col: number,
}

export function editView(
  rows: number,
  cols: number,
  highlighter?: (lines: string[]) => number[][],
){

  const cursor : { start: pos, end: pos } = { start: { line: 0, col: 0 }, end: { line: 0, col: 0 } }

  function setCursor(pos: pos){
    cursor.start = { ...pos };
    cursor.end = { ...pos };
  }

  let lines: string[] = ['']


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
    setCursor({ line: cursor.start.line, col: cursor.start.col + delta });
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
    render()
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
    render();
  }

  document.addEventListener("keydown", e=>{
    if (e.key.length == 1) insertText([e.key]);
    if (e.key == "Enter"){
      insertText(['',''])
    }
    if (e.key == "Backspace"){
      deleteText( e.metaKey ? cursor.start.col : 1 );
    }


    if (e.key == "ArrowLeft") moveCursorX(-1);
    if (e.key == "ArrowRight") moveCursorX(1);
    if (e.key == "ArrowUp") moveCursorY(-1);
    if (e.key == "ArrowDown") moveCursorY(1);

    render()

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
  function render (){
    if (highlighter) colorMap = highlighter(lines);
    let lineEls = lines.map((line, no)=>{
      let chars = line.split('').concat([' ']).map((char ,col) => {
        let cidx = colorMap[no]?.[col] ?? 0;
        let color = palette.colors[cidx % palette.colors.length]
        let el = span(char).style({color})
        el.view.onclick = () => {setCursor({ line: no, col: col }); render()};
        if (cursor.start.line == no && cursor.start.col == col)
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

  function setColorMap(map: number[][]){
    colorMap = map;
    render();
  }

  return {
    view: main,
    setText: (text: string[])=>{
      lines = text;
      render();
    },
    getText: () =>lines,
    setColorMap,
  }
}
