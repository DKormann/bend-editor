export function fileURLToPath(value: string | URL): string {
  const parsed = value instanceof URL ? value : new URL(value);
  return decodeURIComponent(parsed.pathname || "/");
}
