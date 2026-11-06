import { NextResponse } from "next/server";
import { headers } from "next/headers";

const PRIVATE_IPV4 =
  /^(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

function isDevHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") {
    return true;
  }
  return PRIVATE_IPV4.test(host);
}

function hostnamesFromHost(host: string | null) {
  if (!host) return [];
  return host
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(`http://${value}`).hostname.toLowerCase();
      } catch {
        return value.toLowerCase();
      }
    });
}

function originHostname(origin: string | null) {
  if (!origin) return null;
  try {
    return new URL(origin).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostnameFromUrl(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function isAllowedOrigin(input: {
  origin: string | null;
  host?: string | null;
  forwardedHost?: string | null;
  requestUrl?: string | null;
  appUrl?: string | null;
  nodeEnv?: string | null;
}) {
  const originHost = originHostname(input.origin);
  if (!originHost) return false;

  const candidates = new Set<string>();
  for (const value of hostnamesFromHost(input.host ?? null)) candidates.add(value);
  for (const value of hostnamesFromHost(input.forwardedHost ?? null)) {
    candidates.add(value);
  }
  const requestHost = hostnameFromUrl(input.requestUrl);
  if (requestHost) candidates.add(requestHost);
  const appHost = hostnameFromUrl(input.appUrl);
  if (appHost) candidates.add(appHost);

  if (candidates.has(originHost)) return true;

  const nodeEnv = input.nodeEnv ?? process.env.NODE_ENV;
  if (nodeEnv !== "production" && isDevHost(originHost)) return true;
  if (nodeEnv !== "production" && [...candidates].some(isDevHost)) return true;

  return false;
}

export function sameOrigin(request: Request) {
  return isAllowedOrigin({
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    requestUrl: request.url,
    appUrl: process.env.APP_URL,
  });
}

export async function sameOriginServerAction() {
  const headerStore = await headers();
  return isAllowedOrigin({
    origin: headerStore.get("origin"),
    host: headerStore.get("host"),
    forwardedHost: headerStore.get("x-forwarded-host"),
    appUrl: process.env.APP_URL,
  });
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
