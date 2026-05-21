import { auth } from "../firebaseConfig";



const BASE_URL =
  "https://asia-southeast1-transpirafund-webapp.cloudfunctions.net";

const REQUEST_TIMEOUT_MS = 45_000;

type TaggedError = Error & { code?: string };

const taggedError = (code: string, message: string): TaggedError => {
  const err = new Error(message) as TaggedError;
  err.code = code;
  return err;
};

const httpStatusToCode = (status: number): string => {
  if (status === 401) return "unauthenticated";
  if (status === 403) return "permission-denied";
  if (status === 404) return "not-found";
  if (status === 408) return "deadline-exceeded";
  if (status === 409) return "already-exists";
  if (status === 429) return "resource-exhausted";
  if (status === 503 || status === 504) return "unavailable";
  if (status >= 500) return "internal";
  return "unknown";
};

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw taggedError(
        "deadline-exceeded",
        "Request timed out. Check your connection and try again.",
      );
    }
    throw taggedError(
      "unavailable",
      "Network request failed. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
};

const parseError = async (response: Response, json: any): Promise<TaggedError> => {
  const rawStatus = typeof json?.error?.status === "string" ? json.error.status : "";
  const normalized = rawStatus.toLowerCase().replace(/_/g, "-");
  const code = normalized || httpStatusToCode(response.status);
  const message =
    json?.error?.message ||
    `Request failed with status ${response.status}`;
  return taggedError(code, message);
};


export async function callFn(
  name: string,
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const user = auth.currentUser;
  if (!user) {
    throw taggedError("unauthenticated", "Not authenticated. Please log in again.");
  }

  let token: string;
  try {
    token = await user.getIdToken();
  } catch (e: any) {
    throw taggedError(
      "unauthenticated",
      "Couldn't refresh your session. Please sign in again.",
    );
  }

  const response = await fetchWithTimeout(`${BASE_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.error) {
    throw await parseError(response, json);
  }

  return (json.result ?? json) as Record<string, unknown>;
}


export async function callFnPublic(
  name: string,
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await fetchWithTimeout(`${BASE_URL}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.error) {
    throw await parseError(response, json);
  }

  return (json.result ?? json) as Record<string, unknown>;
}
