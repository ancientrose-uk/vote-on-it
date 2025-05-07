import * as path from "jsr:@std/path";

const dirname = path.dirname(new URL(import.meta.url).pathname);

export const projectDir = path.join(dirname, "..");
export const webserverDir = path.join(projectDir, "web-server");
export const publicDir = path.join(webserverDir, "public");

export function pathJoin(...paths: string[]): string {
  return path.join(...paths);
}
