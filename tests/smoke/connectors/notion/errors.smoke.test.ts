import { describe, it, expect } from "vitest";
import { APIResponseError, APIErrorCode } from "@notionhq/client";
import { classifyNotionError } from "../../../../src/connectors/notion/errors.js";

function makeAPIError(code: string, status: number): APIResponseError {
  return new APIResponseError({
    code: code as APIErrorCode,
    message: "test error",
    status,
    rawBodyText: "",
    headers: new Headers(),
    additional_data: undefined,
    request_id: undefined,
  });
}

describe("classifyNotionError", () => {
  it("maps unauthorized to notion.auth.invalid", () => {
    expect(classifyNotionError(makeAPIError(APIErrorCode.Unauthorized, 401))).toBe(
      "notion.auth.invalid"
    );
  });

  it("maps restricted_resource to notion.permission.denied", () => {
    expect(classifyNotionError(makeAPIError(APIErrorCode.RestrictedResource, 403))).toBe(
      "notion.permission.denied"
    );
  });

  it("maps object_not_found to notion.resource.not_found", () => {
    expect(classifyNotionError(makeAPIError(APIErrorCode.ObjectNotFound, 404))).toBe(
      "notion.resource.not_found"
    );
  });

  it("maps conflict_error to notion.conflict", () => {
    expect(classifyNotionError(makeAPIError(APIErrorCode.ConflictError, 409))).toBe(
      "notion.conflict"
    );
  });

  it("maps rate_limited to notion.rate_limited", () => {
    expect(classifyNotionError(makeAPIError(APIErrorCode.RateLimited, 429))).toBe(
      "notion.rate_limited"
    );
  });

  it("maps internal_server_error to notion.provider.error", () => {
    expect(classifyNotionError(makeAPIError(APIErrorCode.InternalServerError, 500))).toBe(
      "notion.provider.error"
    );
  });

  it("maps non-Notion errors to notion.unknown", () => {
    expect(classifyNotionError(new Error("network failure"))).toBe("notion.unknown");
    expect(classifyNotionError("not an error")).toBe("notion.unknown");
  });
});
