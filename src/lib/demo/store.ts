import fs from "fs";
import path from "path";
import { DEMO_PASSWORD, DEMO_USERS, buildSeed } from "@/lib/demo/seed";
import { hashDemoPassword } from "@/lib/demo/passwords";
import type { Database } from "@/lib/domain/types";

export interface DemoFile {
  db: Database;
  passwords: Record<string, string>;
}

const filePath = path.join(process.cwd(), ".data", "db.json");
let chain: Promise<unknown> = Promise.resolve();

function fresh(): DemoFile {
  const passwords: Record<string, string> = {};
  const hash = hashDemoPassword(DEMO_PASSWORD);
  for (const user of DEMO_USERS) passwords[user.id] = hash;
  return { db: buildSeed(new Date()), passwords };
}

function read(): DemoFile {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as DemoFile;
  } catch {
    const data = fresh();
    write(data);
    return data;
  }
}

function write(data: DemoFile) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data));
}

/** Lee el archivo, aplica la función y guarda solo si no lanza. */
export function withDemo<T>(fn: (file: DemoFile) => T): Promise<T> {
  const run = chain.then(() => {
    const current = read();
    const draft = structuredClone(current) as DemoFile;
    const result = fn(draft);
    write(draft);
    return result;
  });
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function usingSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
