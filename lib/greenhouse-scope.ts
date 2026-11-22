import { apiError } from "./server/api-error.ts";

// shortcut: fixed GH-01 pilot, replace with membership lookup before adding greenhouses.
export const PILOT_GREENHOUSE_ID = "GH-01";

export function authorizeGreenhouseScope(greenhouseId: unknown): Response | null {
  return greenhouseId === PILOT_GREENHOUSE_ID
    ? null
    : apiError("GREENHOUSE_FORBIDDEN", "Only GH-01 is available in the pilot.", 403);
}
