export async function lineRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    throw new Error(`LINE API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
