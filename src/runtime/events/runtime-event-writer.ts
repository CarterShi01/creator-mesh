import { promises as fs } from "fs";
import path from "path";
import os from "os";
import type { RuntimeEvent } from "./runtime-event.js";

const eventsDir = (): string =>
  process.env["CREATORMESH_EVENTS_DIR"] ??
  path.join(os.homedir(), "creator-mesh-runtime", "runtime-events");

export async function writeRuntimeEvents(events: RuntimeEvent[]): Promise<void> {
  if (events.length === 0) return;
  const dir = eventsDir();
  await fs.mkdir(dir, { recursive: true });
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  await fs.appendFile(path.join(dir, "runtime-events.jsonl"), lines, "utf-8");
}
