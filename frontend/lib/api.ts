const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export async function api(path: string, opts: RequestInit = {}, token?: string) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

export const login = (loginId: string, birthdate: string) =>
  api("/auth/login", { method: "POST", body: JSON.stringify({ loginId, birthdate }) });

export const askAI = (query: string, token: string) =>
  api("/ai/ask", { method: "POST", body: JSON.stringify({ query }) }, token);
