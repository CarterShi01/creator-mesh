import { describe, it, expect } from "vitest";
import { normalizePage, normalizeBlock } from "../../../../../src/capabilities/connectors/notion/normalize.js";
import type {
  PageObjectResponse,
  BlockObjectResponse,
} from "@notionhq/client/build/src/api-endpoints.js";

const FAKE_PAGE: PageObjectResponse = {
  object: "page",
  id: "page-abc-123",
  created_time: "2024-01-01T00:00:00.000Z",
  last_edited_time: "2024-06-01T00:00:00.000Z",
  created_by: { object: "user", id: "user-1" },
  last_edited_by: { object: "user", id: "user-1" },
  cover: null,
  icon: null,
  parent: { type: "workspace", workspace: true },
  archived: false,
  in_trash: false,
  is_archived: false,
  is_locked: false,
  url: "https://notion.so/page-abc-123",
  public_url: null,
  properties: {
    title: {
      id: "title",
      type: "title",
      title: [
        {
          type: "text",
          plain_text: "My Page",
          href: null,
          annotations: {
            bold: false,
            italic: false,
            strikethrough: false,
            underline: false,
            code: false,
            color: "default",
          },
          text: { content: "My Page", link: null },
        },
      ],
    },
  },
};

const FAKE_PARAGRAPH: BlockObjectResponse = {
  object: "block",
  id: "block-xyz-456",
  parent: { type: "page_id", page_id: "page-abc-123" },
  created_time: "2024-01-01T00:00:00.000Z",
  last_edited_time: "2024-06-01T00:00:00.000Z",
  created_by: { object: "user", id: "user-1" },
  last_edited_by: { object: "user", id: "user-1" },
  has_children: false,
  archived: false,
  in_trash: false,
  type: "paragraph",
  paragraph: {
    rich_text: [
      {
        type: "text",
        plain_text: "Hello world",
        href: null,
        annotations: {
          bold: false,
          italic: false,
          strikethrough: false,
          underline: false,
          code: false,
          color: "default",
        },
        text: { content: "Hello world", link: null },
      },
    ],
    color: "default",
    icon: null,
  },
};

describe("normalizePage", () => {
  it("extracts title, id, url from a full page", () => {
    const result = normalizePage(FAKE_PAGE);
    expect(result.id).toBe("page-abc-123");
    expect(result.title).toBe("My Page");
    expect(result.url).toBe("https://notion.so/page-abc-123");
    expect(result.archived).toBe(false);
    expect(result.createdTime).toBe("2024-01-01T00:00:00.000Z");
    expect(result.lastEditedTime).toBe("2024-06-01T00:00:00.000Z");
  });

  it("returns empty strings for partial page (no properties)", () => {
    const partial = { object: "page" as const, id: "partial-id" };
    const result = normalizePage(partial);
    expect(result.id).toBe("partial-id");
    expect(result.title).toBe("");
    expect(result.url).toBe("");
  });
});

describe("normalizeBlock", () => {
  it("extracts plain text from a paragraph block", () => {
    const result = normalizeBlock(FAKE_PARAGRAPH);
    expect(result.id).toBe("block-xyz-456");
    expect(result.type).toBe("paragraph");
    expect(result.plainText).toBe("Hello world");
    expect(result.hasChildren).toBe(false);
  });

  it("returns unknown for partial block (no type)", () => {
    const partial = { object: "block" as const, id: "partial-block" };
    const result = normalizeBlock(partial);
    expect(result.id).toBe("partial-block");
    expect(result.type).toBe("unknown");
    expect(result.plainText).toBe("");
  });
});
