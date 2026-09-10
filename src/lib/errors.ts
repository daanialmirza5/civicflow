import { NextResponse } from "next/server";
import { ForbiddenError, UnauthorizedError } from "./auth/rbac";
import { InvalidTransitionError } from "./workflow/stateMachine";

export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message);
    this.name = "AppError";
  }
}

/** Maps known domain errors to a structured { error: { code, message } } response, never leaking stack traces. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: error.message } }, { status: 401 });
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: error.message } }, { status: 403 });
  }
  if (error instanceof InvalidTransitionError) {
    return NextResponse.json({ error: { code: "INVALID_TRANSITION", message: error.message } }, { status: 409 });
  }
  if (error instanceof AppError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }, { status: 500 });
}
