import { NextResponse } from "next/server";

import { createRateLimiter } from "@/lib/rateLimit";

/**
 * Contact transmission endpoint.
 *
 * JSON-only, size-capped, validated server-side, honeypotted and rate limited
 * on two tiers before anything is relayed through Resend. Secrets stay in env
 * (.env.local). Errors are returned as generic codes, never stack traces.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_NAME_LENGTH = 200;

/**
 * Hard ceiling on the request body. The longest legal payload is a 5,000
 * character message plus a name and an address, so 16 KB is generous. Enforced
 * while streaming rather than after parsing, so an oversized body is dropped
 * on the floor instead of being buffered into memory first.
 */
const MAX_BODY_BYTES = 16 * 1024;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Two limiters, guarding two different things.
 *
 * `requests` caps how often ONE caller may hit the endpoint at all. Its key is
 * the X-Forwarded-For address, which is only honest when a proxy overwrites it.
 *
 * `relays` caps how many emails can actually leave, across everyone. It is
 * checked immediately before the send and nowhere else, so a rejected or
 * invalid submission - which relays nothing - does not consume the mail budget.
 * There is no header a caller can forge to escape it, which is what closes the
 * X-Forwarded-For rotation bypass found during API testing.
 *
 * Both are in-memory, so each serverless instance keeps its own counters. That
 * is a known limitation of a portfolio contact form, not a claim of distributed
 * rate limiting. Window logic lives in lib/rateLimit.ts and is unit-tested.
 */
const requests = createRateLimiter({ perKey: 5, windowMs: HOUR_MS });
const relays = createRateLimiter({ global: 60, windowMs: HOUR_MS });

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Read the body with a byte cap, aborting the stream the moment the cap is
 * passed. Returns null when the request is too large.
 *
 * Content-Length alone is not enough: it is caller-supplied and a chunked
 * request need not send one at all, so the count has to come from the bytes
 * actually received.
 */
async function readBoundedText(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;

  const body = request.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }

  const merged = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

export async function POST(request: Request) {
  // Require a JSON content type. Without this the endpoint accepts text/plain,
  // which is a CORS-simple request and so can be posted cross-origin with no
  // preflight at all.
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ error: "UNSUPPORTED_MEDIA_TYPE" }, { status: 415 });
  }

  if (requests.check(clientIp(request), Date.now()) !== "ok") {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  const raw = await readBoundedText(request);
  if (raw === null) {
    return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  const { name, email, message, company } = (body ?? {}) as Record<string, unknown>;

  // Honeypot: real users never fill this hidden field. Pretend success.
  if (typeof company === "string" && company.length > 0) {
    return NextResponse.json({ ok: true });
  }

  const errors: Record<string, string> = {};
  if (typeof name !== "string" || name.trim().length < 2 || name.length > MAX_NAME_LENGTH) {
    errors.name = "IDENTITY REQUIRED (MIN 2 CHARACTERS)";
  }
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email) || email.length > 320) {
    errors.email = "VALID CHANNEL (EMAIL) REQUIRED";
  }
  if (
    typeof message !== "string" ||
    message.trim().length < 10 ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    errors.message = "MESSAGE TOO SHORT (MIN 10 CHARACTERS)";
  }
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ error: "VALIDATION", fields: errors }, { status: 422 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 503 });
  }

  // The outbound-mail budget, spent only by a submission that is actually about
  // to send. Checked here rather than at the top of the handler so a bot firing
  // junk at the endpoint cannot exhaust the allowance for real visitors.
  if (relays.check("relay", Date.now()) !== "ok") {
    return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM_EMAIL ?? "AARON <onboarding@resend.dev>",
        to: [to],
        reply_to: email,
        subject: `AARON transmission from ${(name as string).replace(/[\r\n]+/g, " ").trim().slice(0, 80)}`,
        text: `${(message as string).trim()}\n\n- ${(name as string).trim()} (${email})`,
      }),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "DELIVERY_FAILED" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "DELIVERY_FAILED" }, { status: 502 });
  }
}
