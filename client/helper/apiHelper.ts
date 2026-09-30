const BASE_URL = 'http://localhost:8000';

async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => null);

    throw new Error(
      error?.message || `Request failed with status ${res.status}`,
    );
  }

  return res;
}