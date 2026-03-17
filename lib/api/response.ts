import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data } satisfies ApiResponse<T>, { status });
}

export function errorResponse(error: string, status = 400, code?: string): NextResponse {
  return NextResponse.json({ error, code } satisfies ApiResponse, { status });
}

export function unauthorizedResponse(): NextResponse {
  return errorResponse("Unauthorized", 401, "UNAUTHORIZED");
}

export function forbiddenResponse(): NextResponse {
  return errorResponse("Forbidden", 403, "FORBIDDEN");
}

export function notFoundResponse(entity = "Resource"): NextResponse {
  return errorResponse(`${entity} not found`, 404, "NOT_FOUND");
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  const response = errorResponse("Too many requests", 429, "RATE_LIMITED");
  response.headers.set("Retry-After", retryAfter.toString());
  return response;
}

export function validationErrorResponse(details: unknown): NextResponse {
  return NextResponse.json(
    { error: "Validation error", code: "VALIDATION_ERROR", details },
    { status: 422 }
  );
}
