import { NextRequest, NextResponse } from "next/server";

/** Legacy OAuth redirect URL: forwards to customer callback with same query string. */
export function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/callback/customer";
  return NextResponse.redirect(url);
}
