import type { Capability } from "../port.js";

export const NOTION_CAPABILITIES: Capability[] = [
  {
    id: "notion.search.page",
    type: "search",
    resourceType: "page",
    permissionLevel: "safe-read",
    approvalRequirement: "never",
    reversible: true,
    description: "Search Notion pages by query string",
  },
  {
    id: "notion.read.page",
    type: "read",
    resourceType: "page",
    permissionLevel: "safe-read",
    approvalRequirement: "never",
    reversible: true,
    description: "Read a Notion page by ID",
  },
  {
    id: "notion.read.block",
    type: "read",
    resourceType: "block",
    permissionLevel: "safe-read",
    approvalRequirement: "never",
    reversible: true,
    description: "Read all block children of a Notion page or block",
  },
  {
    id: "notion.create.page",
    type: "create",
    resourceType: "page",
    permissionLevel: "write",
    approvalRequirement: "conditional",
    reversible: false,
    description: "Create a new Notion page under a parent page or workspace",
  },
  {
    id: "notion.append.block",
    type: "append",
    resourceType: "block",
    permissionLevel: "write",
    approvalRequirement: "conditional",
    reversible: false,
    description: "Append block children to an existing Notion page or block",
  },
];
