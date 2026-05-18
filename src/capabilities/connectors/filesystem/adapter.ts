import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  ConnectorPort,
  CapabilityRegistry,
  ConnectorAction,
  ConnectorResult,
  Capability,
} from "../port.js";
import type { CapabilityType } from "../types.js";

const CAPABILITIES: Capability[] = [
  {
    id: "filesystem.create",
    type: "create",
    resourceType: "file",
    permissionLevel: "write",
    approvalRequirement: "never",
    reversible: true,
    description: "Write a single file to the local filesystem (creates or overwrites).",
  },
  {
    id: "filesystem.create.files",
    type: "create",
    resourceType: "files",
    permissionLevel: "write",
    approvalRequirement: "never",
    reversible: true,
    description: "Write multiple files to the local filesystem in one operation.",
  },
  {
    id: "filesystem.read",
    type: "read",
    resourceType: "file",
    permissionLevel: "safe-read",
    approvalRequirement: "never",
    reversible: true,
    description: "Read a file from the local filesystem.",
  },
];

class FilesystemCapabilityRegistry implements CapabilityRegistry {
  readonly connectorId: string;
  readonly capabilities = CAPABILITIES;

  constructor(connectorId: string) {
    this.connectorId = connectorId;
  }

  supports(type: CapabilityType, resourceType?: string): boolean {
    return CAPABILITIES.some(
      (c) => c.type === type && (resourceType == null || c.resourceType === resourceType)
    );
  }

  get(type: CapabilityType, resourceType?: string): Capability | undefined {
    return CAPABILITIES.find(
      (c) => c.type === type && (resourceType == null || c.resourceType === resourceType)
    );
  }
}

export interface FilesystemConnectorConfig {
  connectorId?: string;
  baseDir?: string;
}

export class FilesystemConnectorAdapter implements ConnectorPort {
  readonly connectorId: string;
  private readonly baseDir: string;
  private readonly _registry: FilesystemCapabilityRegistry;

  constructor(config: FilesystemConnectorConfig = {}) {
    this.connectorId = config.connectorId ?? "filesystem";
    this.baseDir = config.baseDir ?? process.cwd();
    this._registry = new FilesystemCapabilityRegistry(this.connectorId);
  }

  capabilities(): CapabilityRegistry {
    return this._registry;
  }

  async execute(action: ConnectorAction): Promise<ConnectorResult> {
    const capabilityType = action.capability.type;
    const resourceType = action.resourceType;
    const payload = action.payload ?? {};

    try {
      if (capabilityType === "create" && resourceType === "file") {
        return await this._writeFile(action, payload);
      }
      if (capabilityType === "create" && resourceType === "files") {
        return await this._writeFiles(action, payload);
      }
      if (capabilityType === "read" && resourceType === "file") {
        return await this._readFile(action, payload);
      }
      return this._failure(action, `Unsupported capability: ${capabilityType}/${resourceType}`);
    } catch (err) {
      return this._failure(action, (err as Error).message);
    }
  }

  private async _writeFile(
    action: ConnectorAction,
    payload: Record<string, unknown>
  ): Promise<ConnectorResult> {
    const filePath = this._resolvePath(payload["path"] as string);
    const content = (payload["content"] as string) ?? "";
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
    return {
      connectorId: this.connectorId,
      action,
      status: "success",
      data: { path: filePath },
      completedAt: new Date(),
      auditId: randomUUID(),
    };
  }

  private async _writeFiles(
    action: ConnectorAction,
    payload: Record<string, unknown>
  ): Promise<ConnectorResult> {
    const files = (payload["files"] ?? []) as Array<{ path: string; content: string }>;
    const writtenPaths: string[] = [];
    for (const file of files) {
      const filePath = this._resolvePath(file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content, "utf-8");
      writtenPaths.push(filePath);
    }
    return {
      connectorId: this.connectorId,
      action,
      status: "success",
      data: { paths: writtenPaths },
      completedAt: new Date(),
      auditId: randomUUID(),
    };
  }

  private async _readFile(
    action: ConnectorAction,
    payload: Record<string, unknown>
  ): Promise<ConnectorResult> {
    const filePath = this._resolvePath(payload["path"] as string);
    const content = await fs.readFile(filePath, "utf-8");
    return {
      connectorId: this.connectorId,
      action,
      status: "success",
      data: { path: filePath, content },
      completedAt: new Date(),
      auditId: randomUUID(),
    };
  }

  private _resolvePath(p: string): string {
    if (!p) throw new Error("FilesystemConnector: 'path' is required in payload");
    return path.isAbsolute(p) ? p : path.join(this.baseDir, p);
  }

  private _failure(action: ConnectorAction, error: string): ConnectorResult {
    return {
      connectorId: this.connectorId,
      action,
      status: "failure",
      error,
      completedAt: new Date(),
      auditId: randomUUID(),
    };
  }
}
