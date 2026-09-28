import { NextResponse } from "next/server";
import { AuthError } from "./auth";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
export function fail(e: unknown) {
  if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
  const msg = e instanceof Error ? e.message : "Server error";
  const status = msg === "SLOT_TAKEN" ? 409 : 500;
  return NextResponse.json({ error: msg }, { status });
}
