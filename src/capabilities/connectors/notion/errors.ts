import { APIErrorCode, APIResponseError, isHTTPResponseError } from "@notionhq/client";

export type NotionErrorCode =
  | "notion.auth.invalid"
  | "notion.permission.denied"
  | "notion.resource.not_found"
  | "notion.conflict"
  | "notion.rate_limited"
  | "notion.provider.error"
  | "notion.unknown";

export function classifyNotionError(err: unknown): NotionErrorCode {
  if (err instanceof APIResponseError) {
    switch (err.code) {
      case APIErrorCode.Unauthorized:
        return "notion.auth.invalid";
      case APIErrorCode.RestrictedResource:
        return "notion.permission.denied";
      case APIErrorCode.ObjectNotFound:
        return "notion.resource.not_found";
      case APIErrorCode.ConflictError:
        return "notion.conflict";
      case APIErrorCode.RateLimited:
        return "notion.rate_limited";
      case APIErrorCode.InternalServerError:
      case APIErrorCode.ServiceUnavailable:
      case APIErrorCode.GatewayTimeout:
        return "notion.provider.error";
      default:
        return "notion.unknown";
    }
  }
  if (isHTTPResponseError(err) && err.status >= 500) {
    return "notion.provider.error";
  }
  return "notion.unknown";
}
