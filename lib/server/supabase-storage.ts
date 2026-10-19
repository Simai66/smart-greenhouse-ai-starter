import { env } from "cloudflare:workers";

export const DEFAULT_SUPABASE_STORAGE_BUCKET = "greenhouse-images";

type SupabaseConfig = {
  url: string;
  serviceRoleKey: string;
  bucket: string;
};

export type StorageObjectInfo = {
  exists: boolean;
  contentType: string | null;
  byteSize: number | null;
};

function config(): SupabaseConfig {
  const bindings = env as unknown as Record<string, unknown>;
  const url = bindings.SUPABASE_URL;
  const serviceRoleKey = bindings.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = bindings.SUPABASE_STORAGE_BUCKET ?? DEFAULT_SUPABASE_STORAGE_BUCKET;
  if (typeof url !== "string" || !/^https:\/\//.test(url) || typeof serviceRoleKey !== "string" || serviceRoleKey.length < 20 || typeof bucket !== "string" || !bucket.trim()) {
    throw new Error("Supabase Storage is not configured.");
  }
  return { url: url.replace(/\/+$/, ""), serviceRoleKey, bucket: bucket.trim() };
}

function storageBaseUrl(value: SupabaseConfig): string {
  return `${value.url}/storage/v1`;
}

function encodedPath(path: string): string {
  return path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
}

function requestHeaders(value: SupabaseConfig): HeadersInit {
  return {
    apikey: value.serviceRoleKey,
    Authorization: `Bearer ${value.serviceRoleKey}`,
  };
}

async function throwStorageError(response: Response): Promise<never> {
  let detail = response.statusText;
  try {
    const body = await response.json() as { message?: unknown; error?: unknown };
    detail = typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : detail;
  } catch {
    // Keep status text when the Storage API does not return JSON.
  }
  throw new Error(`Supabase Storage request failed (${response.status}): ${detail}`);
}

export function supabaseStorageBucket(): string {
  return config().bucket;
}

export function publicObjectUrl(bucket: string, objectPath: string): string {
  const value = config();
  return `${storageBaseUrl(value)}/object/public/${encodeURIComponent(bucket)}/${encodedPath(objectPath)}`;
}

export async function createSignedUploadUrl(objectPath: string): Promise<{ uploadUrl: string; expiresAt: string }> {
  const value = config();
  const response = await fetch(`${storageBaseUrl(value)}/object/upload/sign/${encodeURIComponent(value.bucket)}/${encodedPath(objectPath)}`, {
    method: "POST",
    headers: { ...requestHeaders(value), "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok) await throwStorageError(response);
  const body = await response.json() as { url?: unknown; signedUrl?: unknown };
  const rawUrl = typeof body.url === "string" ? body.url : typeof body.signedUrl === "string" ? body.signedUrl : null;
  if (!rawUrl) throw new Error("Supabase Storage did not return a signed upload URL.");
  const uploadUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `${storageBaseUrl(value)}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`;
  return { uploadUrl, expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() };
}

export async function inspectObject(objectPath: string): Promise<StorageObjectInfo> {
  const value = config();
  const response = await fetch(`${storageBaseUrl(value)}/object/${encodeURIComponent(value.bucket)}/${encodedPath(objectPath)}`, {
    method: "HEAD",
    headers: requestHeaders(value),
  });
  if (response.status === 404) return { exists: false, contentType: null, byteSize: null };
  if (!response.ok) await throwStorageError(response);
  const rawSize = response.headers.get("content-length");
  const byteSize = rawSize && /^\d+$/.test(rawSize) ? Number(rawSize) : null;
  return { exists: true, contentType: response.headers.get("content-type"), byteSize: Number.isFinite(byteSize) ? byteSize : null };
}

export async function removeObjects(objectPaths: string[]): Promise<void> {
  if (!objectPaths.length) return;
  const value = config();
  const response = await fetch(`${storageBaseUrl(value)}/object/${encodeURIComponent(value.bucket)}`, {
    method: "DELETE",
    headers: { ...requestHeaders(value), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: objectPaths }),
  });
  if (!response.ok) await throwStorageError(response);
}
