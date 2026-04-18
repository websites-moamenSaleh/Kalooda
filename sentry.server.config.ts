import * as Sentry from "@sentry/nextjs";

Sentry.init({
  // SENTRY_DSN is the server-side var; NEXT_PUBLIC_SENTRY_DSN is the client-side fallback
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  enabled: process.env.NODE_ENV === "production",
});
