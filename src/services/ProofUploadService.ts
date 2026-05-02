import { auth } from "../firebaseConfig";

const BASE_URL =
  "https://asia-southeast1-transpirafund-webapp.cloudfunctions.net";

export type ProofUploadStage =
  | "preparing"
  | "uploading"
  | "finalizing"
  | "done"
  | "error";

export interface ProofUploadProgress {
  stage: ProofUploadStage;
  percent: number;
}

export interface ProofUploadArgs {
  projectId: string;
  milestoneId: string;
  base64: string;
  capturedAt: number;
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface ProofUploadHandle {
  promise: Promise<Record<string, unknown>>;
  abort: () => void;
}

export function uploadProofPhotoWithProgress(
  args: ProofUploadArgs,
  onProgress: (p: ProofUploadProgress) => void,
): ProofUploadHandle {
  let aborted = false;
  let xhrRef: XMLHttpRequest | null = null;

  const promise = (async (): Promise<Record<string, unknown>> => {
    onProgress({ stage: "preparing", percent: 0 });

    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated. Please log in again.");

    const token = await user.getIdToken();
    if (aborted) throw new Error("Upload cancelled.");

    const body = JSON.stringify({ data: args });

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef = xhr;

      xhr.open("POST", `${BASE_URL}/uploadProofPhoto`);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.timeout = 120_000;

      xhr.upload.onprogress = (e) => {
        if (aborted || !e.lengthComputable) return;
        const pct = Math.min(100, Math.round((e.loaded / e.total) * 100));
        onProgress({ stage: "uploading", percent: pct });
      };

      xhr.upload.onload = () => {
        if (aborted) return;
        onProgress({ stage: "finalizing", percent: 100 });
      };

      xhr.onload = () => {
        if (aborted) return;
        const status = xhr.status;
        let json: any = {};
        try {
          json = JSON.parse(xhr.responseText || "{}");
        } catch {
        }
        if (status < 200 || status >= 300 || json?.error) {
          const msg =
            json?.error?.message ||
            `Request failed with status ${status}`;
          const err: any = new Error(msg);
          err.code = json?.error?.status || `http-${status}`;
          reject(err);
          return;
        }
        onProgress({ stage: "done", percent: 100 });
        resolve((json.result ?? json) as Record<string, unknown>);
      };

      xhr.onerror = () => {
        if (aborted) return;
        reject(new Error("Network error. Check your connection and try again."));
      };

      xhr.ontimeout = () => {
        if (aborted) return;
        reject(new Error("Upload timed out. Try again on a stronger connection."));
      };

      xhr.send(body);
    });
  })();

  return {
    promise,
    abort: () => {
      aborted = true;
      try {
        xhrRef?.abort();
      } catch {
      }
    },
  };
}
