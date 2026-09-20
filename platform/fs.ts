import baseSource from "../vendor/bend/bend2/base.bend";
import { normalize } from "./path";

// Install the tiny global surface used while Bend initializes. The compiler
// itself remains unchanged and sees these through its normal Node API calls.
const globals = globalThis as typeof globalThis & {
  process?: { env: Record<string, string | undefined>; execPath: string; platform: string; arch: string };
  Buffer?: { from(value: ArrayBuffer | ArrayBufferView): { toString(encoding: string): string } };
};

globals.process ??= {
  env: {},
  execPath: "/bin/bend",
  platform: "browser",
  arch: "wasm32",
};

globals.Buffer ??= {
  from(value) {
    const bytes = value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return {
      toString(encoding: string): string {
        if (encoding !== "hex") throw new Error(`Unsupported Buffer encoding: ${encoding}`);
        return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
      },
    };
  },
};

const files = new Map<string, string>();

function key(path: string | URL): string {
  if (path instanceof URL) path = path.pathname;
  const value = normalize(path);
  return value.startsWith("/") ? value : "/" + value;
}

export function mount(path: string, source: string): void {
  files.set(key(path), source);
}

export function unmount(path: string): void {
  files.delete(key(path));
}

function ensureBundledBase(path: string): void {
  if (!files.has(path) && path.endsWith("/base.bend")) files.set(path, baseSource);
}

export function existsSync(path: string | URL): boolean {
  const value = key(path);
  ensureBundledBase(value);
  return files.has(value);
}

export function realpathSync(path: string | URL): string {
  const value = key(path);
  ensureBundledBase(value);
  if (!files.has(value)) throw new Error(`ENOENT: no such file, realpath '${value}'`);
  return value;
}

export function readFileSync(path: string | URL, encoding?: string): string {
  if (encoding !== undefined && encoding !== "utf8" && encoding !== "utf-8") {
    throw new Error(`Unsupported file encoding: ${encoding}`);
  }
  const value = files.get(key(path));
  if (value === undefined) throw new Error(`ENOENT: no such file, open '${key(path)}'`);
  return value;
}

export function writeFileSync(path: string | URL, source: string | Uint8Array): void {
  const value = typeof source === "string" ? source : new TextDecoder().decode(source);
  files.set(key(path), value);
}

export function mkdirSync(_path: string | URL, _options?: { recursive?: boolean }): void {
  // Directories are implicit in this in-memory filesystem.
}

// Depending on the final bundle URL, Bend resolves its adjacent Base file to
// one of these. Mounting both keeps that detail out of the compiler adapter.
mount("/base.bend", baseSource);
mount("/bend2/base.bend", baseSource);
