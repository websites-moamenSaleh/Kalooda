import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capture 10% of transactions in production to stay within free tier limits
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Only send errors in production; log to console in dev
  enabled: process.env.NODE_ENV === "production",
});
