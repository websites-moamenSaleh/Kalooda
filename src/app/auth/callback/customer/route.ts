import { NextRequest } from "next/server";
import { handleAuthOAuthCallback } from "@/lib/auth-callback-shared";

export async function GET(request: NextRequest) {
  return handleAuthOAuthCallback(request, "customer");
}
