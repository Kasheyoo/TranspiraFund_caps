import { auth } from "../firebaseConfig";

/**
 * Shared Cloud Function caller.
 * Single source of truth for the base URL and fetch logic —
 * no more copy-pasting callFn in every file.
 */

const BASE_URL =
  "https://asia-southeast1-transpirafund-webapp.cloudfunctions.net";

/** Authenticated call — requires a logged-in Firebase user */
export async function callFn(
  name: string,
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated. Please log in again.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${BASE_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.error) {
    const msg =
      json?.error?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(msg);
  }

  return (json.result ?? json) as Record<string, unknown>;
}

/** Unauthenticated call — no Bearer token (e.g. password reset before login) */
export async function callFnPublic(
  name: string,
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await fetch(`${BASE_URL}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.error) {
    const msg =
      json?.error?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(msg);
  }

  return (json.result ?? json) as Record<string, unknown>;
}
