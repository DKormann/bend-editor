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
  // start is the selection anchor; end is the active caret.
  const cursor: { start: pos, end: pos } = {
    start: { line: 0, col: 0 },
    end: { line: 0, col: 0 },
  };
  let lines: string[] = [""];
  let editable = true;
  let dragging = false;
  let definitionHandler: ((request: DefinitionRequest) => void) | undefined;
  let typeHandler: ((request: DefinitionRequest, target: HTMLElement) => void) | undefined;
  let typeLeaveHandler: (() => void) | undefined;

  const samePos = (a: pos, b: pos) => a.line === b.line && a.col === b.col;
  const before = (a: pos, b: pos) => a.line < b.line || (a.line === b.line && a.col < b.col);

  function clamp(value: pos): pos {
    const line = Math.max(0, Math.min(lines.length - 1, value.line));
    return { line, col: Math.max(0, Math.min(lines[line]!.length, value.col)) };
  }

  function setCursor(value: pos): void {
    const at = clamp(value);
    cursor.start = { ...at };
    cursor.end = { ...at };
  }

  function moveCursor(value: pos, extend = false): void {
    const at = clamp(value);
    if (!extend) cursor.start = { ...at };
    cursor.end = { ...at };
  }

  function selection(): { from: pos; to: pos } {
    return before(cursor.end, cursor.start)
      ? { from: cursor.end, to: cursor.start }
      : { from: cursor.start, to: cursor.end };
  }

  function hasSelection(): boolean {
    return !samePos(cursor.start, cursor.end);
  }

  function selectedText(): string {
    if (!hasSelection()) return "";
    const { from, to } = selection();
    if (from.line === to.line) return lines[from.line]!.slice(from.col, to.col);
    return [
      lines[from.line]!.slice(from.col),
      ...lines.slice(from.line + 1, to.line),
      lines[to.line]!.slice(0, to.col),
    ].join("\n");
  }

  function isSelected(line: number, col: number): boolean {
    if (!hasSelection()) return false;
    const { from, to } = selection();
    if (line < from.line || line > to.line) return false;
    if (from.line === to.line) return col >= from.col && col < to.col;
    if (line === from.line) return col >= from.col;
    if (line === to.line) return col < to.col;
    return true;
  }

  function deleteSelection(): boolean {
    if (!hasSelection()) return false;
    const { from, to } = selection();
    const joined = lines[from.line]!.slice(0, from.col) + lines[to.line]!.slice(to.col);
    lines.splice(from.line, to.line - from.line + 1, joined);
    setCursor(from);
    return true;
  }

  function definitionAt(value: pos): DefinitionRequest | undefined {
    const line = lines[value.line] ?? "";
    const isName = (char: string) => /[A-Za-z0-9_.$]/.test(char);
    let start = Math.min(value.col, Math.max(0, line.length - 1));
    if (!isName(line[start] ?? "")) return undefined;
    let end = start + 1;
    while (start > 0 && isName(line[start - 1]!)) start -= 1;
    while (end < line.length && isName(line[end]!)) end += 1;
    return { line: value.line, col: start, token: line.slice(start, end) };
  }

  function requestDefinition(value: pos): void {
    const request = definitionAt(value);
    if (request) definitionHandler?.(request);
  }

  function insertText(input: string[]): void {
    if (input.length === 0) return;
    const text = [...input];
    deleteSelection();
    const at = cursor.end;
    text[0] = lines[at.line]!.slice(0, at.col) + text[0];
    const next = { line: at.line + text.length - 1, col: text[text.length - 1]!.length };
    text[text.length - 1] += lines[at.line]!.slice(at.col);
    lines.splice(at.line, 1, ...text);
    setCursor(next);
    onTextChange();
  }

  function deleteBackward(toLineStart = false): void {
    if (deleteSelection()) return onTextChange();
    const at = cursor.end;
    if (at.col > 0) {
      const count = toLineStart ? at.col : 1;
      lines[at.line] = lines[at.line]!.slice(0, at.col - count) + lines[at.line]!.slice(at.col);
      setCursor({ line: at.line, col: at.col - count });
    } else if (at.line > 0) {
      const col = lines[at.line - 1]!.length;
      lines[at.line - 1] += lines[at.line];
      lines.splice(at.line, 1);
      setCursor({ line: at.line - 1, col });
    } else return;
    onTextChange();
  }

  function deleteForward(): void {
    if (deleteSelection()) return onTextChange();
    const at = cursor.end;
    if (at.col < lines[at.line]!.length) {
      lines[at.line] = lines[at.line]!.slice(0, at.col) + lines[at.line]!.slice(at.col + 1);
    } else if (at.line < lines.length - 1) {
      lines[at.line] += lines[at.line + 1];
      lines.splice(at.line + 1, 1);
    } else return;
    onTextChange();
  }

  function horizontal(value: pos, delta: -1 | 1): pos {
    if (delta < 0) {
      if (value.col > 0) return { line: value.line, col: value.col - 1 };
      if (value.line > 0) return { line: value.line - 1, col: lines[value.line - 1]!.length };
      return value;
    }
    if (value.col < lines[value.line]!.length) return { line: value.line, col: value.col + 1 };
    if (value.line < lines.length - 1) return { line: value.line + 1, col: 0 };
    return value;
  }

  document.addEventListener("keydown", event => {
    if (document.activeElement !== main.view) return;
    const mod = event.metaKey || event.ctrlKey;
    if (event.key === "F12") {
      event.preventDefault();
      requestDefinition(cursor.end);
      return;
    }
    if (mod && event.key.toLowerCase() === "a") {
      event.preventDefault();
      cursor.start = { line: 0, col: 0 };
      cursor.end = { line: lines.length - 1, col: lines.at(-1)!.length };
      return render();
    }
    if (!editable) return;
    if (event.key.length === 1 && !mod) {
      event.preventDefault();
      return insertText([event.key]);
    }
    if (event.key === "Enter" && !event.metaKey) {
      event.preventDefault();
      return insertText(["", ""]);
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      return deleteBackward(mod);
    }
    if (event.key === "Delete") {
      event.preventDefault();
      return deleteForward();
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (hasSelection() && !event.shiftKey && !mod) {
        return setCursor(event.key === "ArrowLeft" ? selection().from : selection().to), render();
      }
      const target = mod
        ? { line: cursor.end.line, col: event.key === "ArrowLeft" ? 0 : lines[cursor.end.line]!.length }
        : horizontal(cursor.end, event.key === "ArrowLeft" ? -1 : 1);
      moveCursor(target, event.shiftKey);
      return render();
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const delta = event.key === "ArrowUp" ? -1 : 1;
      const target = mod
        ? { line: delta < 0 ? 0 : lines.length - 1, col: cursor.end.col }
        : { line: cursor.end.line + delta, col: cursor.end.col };
      moveCursor(target, event.shiftKey);
      return render();
    }
  });

  document.addEventListener("copy", event => {
    if (document.activeElement !== main.view || !hasSelection()) return;
    event.preventDefault();
    event.clipboardData?.setData("text/plain", selectedText());
  });

  document.addEventListener("cut", event => {
    if (document.activeElement !== main.view || !editable || !hasSelection()) return;
    event.preventDefault();
    event.clipboardData?.setData("text/plain", selectedText());
    deleteSelection();
    onTextChange();
  });

  document.addEventListener("paste", event => {
    if (document.activeElement !== main.view || !editable) return;
    const text = event.clipboardData?.getData("text/plain");
    if (text === undefined) return;
    event.preventDefault();
    insertText(text.replace(/\r\n?/g, "\n").split("\n"));
  });

  document.addEventListener("mouseup", () => { dragging = false; });

  const main = pre().style({
    margin: "0",
    width: `${cols}ch`,
    height: `${rows}em`,
    padding: "1em",
    overflow: "auto",
    outline: "none",
    userSelect: "none",
  });
  main.view.tabIndex = 0;
  main.view.onclick = event => {
    if (event.target === main.view) {
      main.view.focus();
      setCursor({ line: lines.length - 1, col: lines.at(-1)!.length });
      render();
    }
  };
  main.view.onmousemove = event => {
    if (!dragging) return;
    const target = event.target as HTMLElement;
    const line = Number(target.dataset.line);
    const col = Number(target.dataset.col);
    if (Number.isInteger(line) && Number.isInteger(col)) {
      moveCursor({ line, col }, true);
      render();
    }
  };

  let colorMap: number[][] = [];

  function onTextChange(): void {
    if (highlighter) colorMap = highlighter(lines);
    render();
    onChange?.([...lines]);
  }

  function render(): void {
    const lineEls = lines.map((line, no) => {
      const chars = line.split("").concat([" "]).map((char, col) => {
        const cidx = colorMap[no]?.[col] ?? 0;
        const el = span(char).style({ color: palette.colors[cidx % palette.colors.length] });
        el.view.dataset.line = String(no);
        el.view.dataset.col = String(col);
        el.view.onmousedown = event => {
          event.preventDefault();
          main.view.focus();
          if (event.metaKey || event.ctrlKey) {
            setCursor({ line: no, col });
            requestDefinition({ line: no, col });
          } else {
            if (event.shiftKey) moveCursor({ line: no, col }, true);
            else setCursor({ line: no, col });
            dragging = true;
          }
          render();
        };
        el.view.onmouseenter = () => {
          if (dragging) return;
          const request = definitionAt({ line: no, col });
          if (request) typeHandler?.(request, el.view);
        };
        el.view.onmouseleave = () => typeLeaveHandler?.();
        if (isSelected(no, col)) {
          el.style({ background: palette.hint });
        } else if (!hasSelection() && samePos(cursor.end, { line: no, col })) {
          el.style({ background: palette.accent, width: "1ch" });
        }
        return el;
      });
      const number = span(no.toString().padStart(3, " ") + " ").style({ color: palette.hint });
      const lineEl = div(number, ...chars);
      lineEl.view.onmousedown = event => {
        if (event.target !== lineEl.view) return;
        event.preventDefault();
        main.view.focus();
        setCursor({ line: no, col: line.length });
        dragging = true;
        render();
      };
      return lineEl;
    });
    main.replaceChildren(...lineEls);
  }

  insertText(["import Base", "", "def main() -> Nat:", "  0n"]);

  return {
    view: main,
    setText: (text: string[]) => {
      lines = text.length === 0 ? [""] : [...text];
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
      setCursor({ line, col });
      render();
      requestAnimationFrame(() => main.view.children.item(cursor.end.line)
        ?.scrollIntoView({ block: "center" }));
    },
  };
}
