const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("tivask_token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: "include", // send cookies
  });

  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch (_) {}

    if (res.status === 401 && typeof window !== "undefined") {
      if (!window.location.pathname.includes("/login")) {
        localStorage.removeItem("tivask_token");
        window.location.href = "/login";
      }
    }

    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  get: <T>(url: string) => fetchApi<T>(url, { method: "GET" }),
  post: <T>(url: string, body?: any) =>
    fetchApi<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(url: string, body?: any) =>
    fetchApi<T>(url, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(url: string) => fetchApi<T>(url, { method: "DELETE" }),
};
