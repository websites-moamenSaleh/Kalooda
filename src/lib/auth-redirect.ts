/** Same-origin relative path only; blocks open redirects. */
export function getSafeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  const pathOnly = raw.split("?")[0];
  if (
    pathOnly === "/sign-in" ||
    pathOnly === "/sign-up" ||
    pathOnly === "/admin/sign-in"
  ) {
    return null;
  }
  return raw;
}
