export const HUB_ORIGIN = "https://hub.bend-lang.com";

export type HubPackage = {
  hash: string;
  files: Record<string, number>;
  bytes: number;
  ts: number;
  desc: string;
};

const HASH = /^0x[0-9a-f]{32}$/;

export async function fetchHubIndex(): Promise<HubPackage[]> {
  const response = await fetch(`${HUB_ORIGIN}/index.json`);
  if (!response.ok) throw new Error(`Bend Hub answered ${response.status}`);
  const packages = await response.json() as HubPackage[];
  return packages.filter(pkg => HASH.test(pkg.hash) && pkg.files !== null);
}

export async function fetchHubFile(hash: string, path: string): Promise<string> {
  if (!HASH.test(hash) || path.startsWith("/") || path.split("/").includes("..")) {
    throw new Error("Invalid Bend Hub file path");
  }
  const response = await fetch(`${HUB_ORIGIN}/${hash}/${path}`);
  if (!response.ok) throw new Error(`Bend Hub answered ${response.status}`);
  return response.text();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
