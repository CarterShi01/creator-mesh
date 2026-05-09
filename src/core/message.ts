export type MessageSource = "manual";

export interface Message {
  id: string;
  content: string;
  createdAt: Date;
  source: MessageSource;
}

export function createMessage(
  content: string,
  source: MessageSource = "manual"
): Message {
  const trimmed = content.trim();
  if (trimmed === "") {
    throw new Error("Message content must not be empty.");
  }
  return {
    id: crypto.randomUUID(),
    content: trimmed,
    createdAt: new Date(),
    source,
  };
}
