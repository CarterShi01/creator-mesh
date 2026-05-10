import type {
  BlockObjectResponse,
  PageObjectResponse,
  PartialBlockObjectResponse,
  PartialPageObjectResponse,
  RichTextItemResponse,
} from "@notionhq/client/build/src/api-endpoints.js";

export interface NotionPageData {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
  createdTime: string;
  archived: boolean;
}

export interface NotionBlockData {
  id: string;
  type: string;
  plainText: string;
  hasChildren: boolean;
}

export interface NotionSearchData {
  results: NotionPageData[];
  hasMore: boolean;
  nextCursor?: string;
}

export interface NotionCreateData {
  id: string;
  url: string;
  title: string;
}

function extractPlainText(richText: RichTextItemResponse[]): string {
  return richText.map((t) => t.plain_text).join("");
}

function extractPageTitle(page: PageObjectResponse): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === "title") {
      return extractPlainText(prop.title);
    }
  }
  return "";
}

export function normalizePage(
  page: PageObjectResponse | PartialPageObjectResponse
): NotionPageData {
  if (!("properties" in page)) {
    return {
      id: page.id,
      title: "",
      url: "",
      lastEditedTime: "",
      createdTime: "",
      archived: false,
    };
  }
  return {
    id: page.id,
    title: extractPageTitle(page),
    url: page.url,
    lastEditedTime: page.last_edited_time,
    createdTime: page.created_time,
    archived: page.archived,
  };
}

type AnyBlock = BlockObjectResponse | PartialBlockObjectResponse;

function extractBlockPlainText(block: BlockObjectResponse): string {
  const type = block.type as string;
  const content = (block as Record<string, unknown>)[type];
  if (content && typeof content === "object" && "rich_text" in content) {
    const richText = (content as { rich_text: RichTextItemResponse[] }).rich_text;
    return extractPlainText(richText);
  }
  return "";
}

export function normalizeBlock(block: AnyBlock): NotionBlockData {
  if (!("type" in block)) {
    return { id: block.id, type: "unknown", plainText: "", hasChildren: false };
  }
  return {
    id: block.id,
    type: block.type,
    plainText: extractBlockPlainText(block as BlockObjectResponse),
    hasChildren: block.has_children,
  };
}
