/** Cloudflare Worker entry point for the vinext-starter template. */
import handler from "vinext/server/app-router-entry";
import { runImageRetention } from "@/lib/server/inspection-images";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_STORAGE_BUCKET?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return handler.fetch(request, env, ctx);
  },
  async scheduled(controller: { scheduledTime: number }, _env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runImageRetention(new Date(controller.scheduledTime)));
  },
};

export default worker;
