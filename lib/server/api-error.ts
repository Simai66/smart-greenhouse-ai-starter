export type ApiErrorBody = { code: string; message: string };

export function apiError(code: string, message: string, status: number): Response {
  return Response.json({ error: { code, message } }, { status });
}

export function isApiErrorBody(value: unknown): value is { error: ApiErrorBody } {
  if (!value || typeof value !== "object" || !("error" in value)) return false;
  const error = (value as { error?: unknown }).error;
  return Boolean(error && typeof error === "object" && "code" in error && "message" in error && typeof (error as { code?: unknown }).code === "string" && typeof (error as { message?: unknown }).message === "string");
}
