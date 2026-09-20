// A small lexical highlighter. It deliberately does not try to parse Bend:
// malformed/incomplete programs still receive stable highlighting while typing.

const TEXT = 0;
const KEYWORD = 1;
const COMMENT = 2;
const LITERAL = 3;
const TYPE = 4;

const keywords = new Set([
  "as", "case", "def", "do", "exs", "for", "import", "is", "law",
  "match", "return", "type", "where",
]);

const typeWords = new Set([
  "Base", "Data", "Kind", "Quant", "Type",
]);

function isNameStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isNameChar(char: string): boolean {
  return /[A-Za-z0-9_.$E]/.test(char);
}

function paint(row: number[], from: number, to: number, color: number): void {
  for (let i = from; i < to; i += 1) row[i] = color;
}

/** Returns one palette index per UTF-16 code unit in each source line. */
export function highlightBend(lines: string[]): number[][] {
  return lines.map(line => {
    const colors = Array<number>(line.length).fill(TEXT);
    let i = 0;

    while (i < line.length) {
      const char = line[i]!;

      // Bend comments continue to the end of the line.
      if (char === "#") {
        paint(colors, i, line.length, COMMENT);
        break;
      }

      // Strings and character literals, including escaped delimiters.
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

      // Decimal literals, including Bend's Nat suffix and decimal fractions.
      if (/\d/.test(char)) {
        const start = i++;
        while (i < line.length && /[0-9A-Fa-f_xX.]/.test(line[i]!)) i += 1;
        if (line[i] === "n") i += 1;
        paint(colors, start, i, LITERAL);
        continue;
      }

      if (isNameStart(char)) {
        const start = i++;
        while (i < line.length && isNameChar(line[i]!)) i += 1;
        const word = line.slice(start, i);
        const color = keywords.has(word)
          ? KEYWORD
          : typeWords.has(word) || /^[A-Z]/.test(word)
            ? TYPE
            : TEXT;
        paint(colors, start, i, color);
        continue;
      }

      // Unsafe annotations and the most important type/proof operators.
      if (line.startsWith("@unsafe", i)) {
        paint(colors, i, i + 7, KEYWORD);
        i += 7;
        continue;
      }
      const operator = ["->", "==", "!=", "<&>", "&0", "&1", "&2"]
        .find(token => line.startsWith(token, i));
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
