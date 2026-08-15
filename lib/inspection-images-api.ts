import { IMAGE_CONTENT_TYPES, IMAGE_MAX_BYTES, type ImageContentType } from "@/lib/server/image-contract";

export type InspectionDetection = {
  id: string;
  plantId: string;
  classification: string;
  confidence: number;
  severity: string;
  modelVersion: string;
  detectedAt: string;
};

export type InspectionImage = {
  imageId: string;
  greenhouseId: string;
  objectPath: string;
  publicUrl: string | null;
  source: string;
  cameraId: string | null;
  plantId: string | null;
  contentType: string;
  byteSize: number;
  capturedAt: string | null;
  uploadedAt: string | null;
  expiresAt: string | null;
  status: "pending" | "ready" | "failed" | "expired";
  detectionCount: number;
  detections: InspectionDetection[];
};

export class InspectionImagesApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "InspectionImagesApiError";
  }
}

async function responseError(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string") return body.error;
    if (body.error && typeof body.error === "object" && typeof (body.error as { message?: unknown }).message === "string") return (body.error as { message: string }).message;
  } catch {
    // Fall through to status-specific generic error.
  }
  return "ไม่สามารถดำเนินการกับภาพได้";
}

function isContentType(value: string): value is ImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

function assertFile(file: File) {
  if (!isContentType(file.type)) throw new InspectionImagesApiError("รองรับเฉพาะ JPEG, PNG และ WebP", 400);
  if (file.size < 1 || file.size > IMAGE_MAX_BYTES) throw new InspectionImagesApiError("รูปต้องมีขนาดไม่เกิน 10 MiB", 400);
}

async function jsonRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (!response.ok) throw new InspectionImagesApiError(await responseError(response), response.status);
  return response.json() as Promise<T>;
}

export const inspectionImagesApi = {
  async list(greenhouseId: string, cameraId: string | null): Promise<InspectionImage[]> {
    const params = new URLSearchParams({ greenhouseId, limit: "100" });
    if (cameraId) params.set("cameraId", cameraId);
    const result = await jsonRequest<{ images?: unknown }>(`/api/images?${params.toString()}`, { cache: "no-store" });
    return Array.isArray(result.images) ? result.images as InspectionImage[] : [];
  },

  async upload(file: File, input: { greenhouseId: string; cameraId: string | null; plantId: string | null; capturedAt?: string }): Promise<InspectionImage> {
    assertFile(file);
    const upload = await jsonRequest<{ imageId: string; uploadUrl: string }>("/api/images/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, contentType: file.type, byteSize: file.size }),
    });
    const direct = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!direct.ok) throw new InspectionImagesApiError("Supabase Storage รับไฟล์ไม่สำเร็จ", direct.status);
    return jsonRequest<InspectionImage>("/api/images/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId: upload.imageId }),
    });
  },
};
