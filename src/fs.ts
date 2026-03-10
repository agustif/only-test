import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";

export const ensureDir = async (path: string): Promise<void> => {
  await mkdir(path, { recursive: true });
};

export const readText = (path: string): Promise<string> => readFile(path, "utf8");

export const writeText = async (path: string, content: string): Promise<void> => {
  await writeFile(path, content, "utf8");
};

export const makeExecutable = async (path: string): Promise<void> => {
  await chmod(path, 0o755);
};
