import { NextResponse } from "next/server";

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    return originUrl.protocol === requestUrl.protocol && originUrl.host === requestUrl.host;
  } catch {
    return false;
  }
}

export function csrfFailure() {
  return NextResponse.json(
    { error: "Request origin could not be verified." },
    { status: 403 },
  );
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
