export type ThoughtSource = "manual";

export interface Thought {
  id: string;
  content: string;
  createdAt: Date;
  source: ThoughtSource;
}

export function createThought(
  content: string,
  source: ThoughtSource = "manual"
): Thought {
  const trimmed = content.trim();
  if (trimmed === "") {
    throw new Error("Thought content must not be empty.");
  }
  return {
    id: crypto.randomUUID(),
    content: trimmed,
    createdAt: new Date(),
    source,
  };
}
