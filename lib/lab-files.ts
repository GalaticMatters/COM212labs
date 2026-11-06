import { cacheLife } from "next/cache";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LAB_FILE_KEYS, type LabFileKey } from "@/lib/targets";

export async function loadLabFiles(): Promise<Record<LabFileKey, string>> {
  "use cache";
  cacheLife("max");

  const entries = await Promise.all(
    LAB_FILE_KEYS.map(async (key) => {
      const filePath = path.join(process.cwd(), "lab", key);
      const text = await readFile(filePath, "utf8");
      return [key, text] as const;
    }),
  );

  return Object.fromEntries(entries) as Record<LabFileKey, string>;
}
