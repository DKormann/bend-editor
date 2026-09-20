// The Bend core only uses this small POSIX subset of node:path.

function parts(path: string): string[] {
  return path.split("/");
}

export function normalize(input: string): string {
  if (input === "") return ".";
  const absolute = input.startsWith("/");
  const out: string[] = [];
  for (const part of parts(input)) {
    if (part === "" || part === ".") continue;
    if (part === "..") {
      if (out.length > 0 && out[out.length - 1] !== "..") out.pop();
      else if (!absolute) out.push(part);
    } else {
      out.push(part);
    }
  }
  const value = (absolute ? "/" : "") + out.join("/");
  return value || (absolute ? "/" : ".");
}

export function join(...values: string[]): string {
  return normalize(values.filter(Boolean).join("/"));
}

export function dirname(input: string): string {
  const value = normalize(input);
  if (value === "/" || value === ".") return value;
  const slash = value.lastIndexOf("/");
  if (slash < 0) return ".";
  return slash === 0 ? "/" : value.slice(0, slash);
}

export function resolve(...values: string[]): string {
  let result = "";
  for (let i = values.length - 1; i >= 0; i -= 1) {
    result = values[i] + (result ? "/" + result : "");
    if (values[i]!.startsWith("/")) break;
  }
  return normalize(result.startsWith("/") ? result : "/" + result);
}

export const delimiter = ":";
export const posix = { normalize, join, dirname, resolve, delimiter };
