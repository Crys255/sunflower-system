export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const rawText = await response.text();
  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  let data: unknown = null;
  if (rawText) {
    if (isJson) {
      data = JSON.parse(rawText);
    } else {
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }
    }
  }

  if (!response.ok) {
    const fallbackMessage = rawText.startsWith("<!DOCTYPE") || rawText.startsWith("<html")
      ? "Server mengembalikan halaman error, bukan JSON. Cek konfigurasi API, database, atau session."
      : "Request gagal.";
    const message =
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof (data as { message?: unknown }).message === "string"
        ? (data as { message: string }).message
        : fallbackMessage;
    throw new Error(message);
  }

  return data as T;
}
