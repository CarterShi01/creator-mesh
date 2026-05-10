import { Client, isFullPage } from "@notionhq/client";
import type {
  BlockObjectResponse,
  CreatePageParameters,
  AppendBlockChildrenParameters,
} from "@notionhq/client/build/src/api-endpoints.js";
import { randomUUID } from "crypto";

import type {
  CapabilityRegistry,
  ConnectorAction,
  ConnectorPort,
  ConnectorResult,
  Capability,
} from "../port.js";
import type { CapabilityType } from "../types.js";
import { NOTION_CAPABILITIES } from "./capabilities.js";
import { classifyNotionError } from "./errors.js";
import {
  normalizeBlock,
  normalizePage,
  type NotionBlockData,
  type NotionSearchData,
} from "./normalize.js";

export interface NotionConnectorConfig {
  connectorId: string;
  apiKey: string;
  notionVersion?: string;
}

class NotionCapabilityRegistry implements CapabilityRegistry {
  readonly connectorId: string;
  readonly capabilities: Capability[];

  constructor(connectorId: string) {
    this.connectorId = connectorId;
    this.capabilities = NOTION_CAPABILITIES;
  }

  supports(type: CapabilityType, resourceType?: string): boolean {
    return this.capabilities.some(
      (c) => c.type === type && (resourceType == null || c.resourceType === resourceType)
    );
  }

  get(type: CapabilityType, resourceType?: string): Capability | undefined {
    return this.capabilities.find(
      (c) => c.type === type && (resourceType == null || c.resourceType === resourceType)
    );
  }
}

export class NotionConnectorAdapter implements ConnectorPort {
  readonly connectorId: string;
  private readonly client: Client;
  private readonly registry: NotionCapabilityRegistry;

  constructor(config: NotionConnectorConfig) {
    this.connectorId = config.connectorId;
    this.client = new Client({
      auth: config.apiKey,
      notionVersion: config.notionVersion,
    });
    this.registry = new NotionCapabilityRegistry(config.connectorId);
  }

  capabilities(): CapabilityRegistry {
    return this.registry;
  }

  async execute(action: ConnectorAction): Promise<ConnectorResult> {
    const base = {
      connectorId: this.connectorId,
      action,
      completedAt: new Date(),
      auditId: randomUUID(),
    };

    try {
      const data = await this.dispatch(action);
      return { ...base, status: "success", data };
    } catch (err) {
      const error = classifyNotionError(err);
      return { ...base, status: "failure", error };
    }
  }

  private async dispatch(action: ConnectorAction): Promise<unknown> {
    const { type } = action.capability;
    const { resourceType, resourceId, payload } = action;

    if (type === "search" && resourceType === "page") {
      return this.searchPages(payload);
    }
    if (type === "read" && resourceType === "page") {
      return this.readPage(resourceId);
    }
    if (type === "read" && resourceType === "block") {
      return this.readBlocks(resourceId);
    }
    if (type === "create" && resourceType === "page") {
      return this.createPage(payload);
    }
    if (type === "append" && resourceType === "block") {
      return this.appendBlocks(resourceId, payload);
    }

    throw new Error(`notion.unsupported: ${type}/${resourceType}`);
  }

  private async searchPages(payload?: Record<string, unknown>): Promise<NotionSearchData> {
    const query = typeof payload?.["query"] === "string" ? payload["query"] : "";
    const startCursor = typeof payload?.["cursor"] === "string" ? payload["cursor"] : undefined;

    const response = await this.client.search({
      query,
      filter: { property: "object", value: "page" },
      start_cursor: startCursor,
    });

    return {
      results: response.results.filter(isFullPage).map(normalizePage),
      hasMore: response.has_more,
      nextCursor: response.next_cursor ?? undefined,
    };
  }

  private async readPage(resourceId?: string) {
    if (!resourceId) throw new Error("notion.unknown: resourceId required for read/page");
    const page = await this.client.pages.retrieve({ page_id: resourceId });
    return normalizePage(page);
  }

  private async readBlocks(resourceId?: string): Promise<NotionBlockData[]> {
    if (!resourceId) throw new Error("notion.unknown: resourceId required for read/block");

    const blocks: NotionBlockData[] = [];
    let cursor: string | undefined;

    do {
      const response = await this.client.blocks.children.list({
        block_id: resourceId,
        start_cursor: cursor,
      });
      for (const block of response.results) {
        blocks.push(normalizeBlock(block));
      }
      cursor = response.has_more && response.next_cursor ? response.next_cursor : undefined;
    } while (cursor);

    return blocks;
  }

  private async createPage(payload?: Record<string, unknown>) {
    const rawParent = payload?.["parent"];
    let parent: CreatePageParameters["parent"] | undefined;
    if (typeof rawParent === "string") {
      parent = { type: "page_id" as const, page_id: rawParent };
    } else {
      parent = rawParent as CreatePageParameters["parent"] | undefined;
    }
    const title = typeof payload?.["title"] === "string" ? payload["title"] : "Untitled";

    if (!parent) throw new Error("notion.unknown: parent required for create/page");

    const page = await this.client.pages.create({
      parent,
      properties: {
        title: {
          title: [{ type: "text", text: { content: title } }],
        },
      },
    });

    return normalizePage(page);
  }

  private async appendBlocks(resourceId?: string, payload?: Record<string, unknown>) {
    if (!resourceId) throw new Error("notion.unknown: resourceId required for append/block");

    const children = payload?.["children"] as
      | AppendBlockChildrenParameters["children"]
      | undefined;

    if (!children || !Array.isArray(children)) {
      throw new Error("notion.unknown: children required for append/block");
    }

    const response = await this.client.blocks.children.append({
      block_id: resourceId,
      children,
    });

    return (response.results as BlockObjectResponse[]).map(normalizeBlock);
  }
}
