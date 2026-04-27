import { NextRequest, NextResponse } from "next/server";

const SLACK_CHANNEL = "C0ASJHCE9AR"; // #kalooda-alerts
const VERCEL_TEAM = "vanguardtechnologies-team";
const VERCEL_PROJECT = "kalooda";

function buildVercelLogsUrl(timestamp: number): string {
  const since = new Date(timestamp - 5 * 60 * 1000).toISOString();
  const until = new Date(timestamp + 2 * 60 * 1000).toISOString();
  return `https://vercel.com/${VERCEL_TEAM}/${VERCEL_PROJECT}/logs?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&environment=production`;
}

export async function POST(req: NextRequest) {
  const slackToken = process.env.SLACK_BOT_TOKEN;
  if (!slackToken) {
    return NextResponse.json({ error: "No Slack token" }, { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let title: string;
  let culprit: string;
  let permalink: string;
  let level: string;
  let timestamp: number;

  if (body.action) {
    // Modern Internal Integration format: { action, data: { issue } }
    const action = body.action as string;
    if (action !== "created" && action !== "triggered") {
      return NextResponse.json({ ok: true });
    }
    const issue = (body.data as Record<string, unknown>)
      ?.issue as Record<string, unknown> | undefined;
    if (!issue) return NextResponse.json({ ok: true });

    title = (issue.title as string) ?? "Unknown error";
    culprit = (issue.culprit as string) ?? "";
    permalink = (issue.permalink as string) ?? "";
    level = (issue.level as string) ?? "error";
    const firstSeen = issue.firstSeen as string | undefined;
    timestamp = firstSeen ? new Date(firstSeen).getTime() : Date.now();
  } else if (body.event) {
    // Legacy webhook plugin format: { project, message, event, url, level }
    const event = body.event as Record<string, unknown>;
    // message is empty for captureException — fall back to event.exception or event.type
    const exception = event.exception as Record<string, unknown> | undefined;
    const firstValue = (exception?.values as Array<Record<string, unknown>>)?.[0];
    const exceptionTitle = firstValue
      ? `${firstValue.type ?? ""}: ${firstValue.value ?? ""}`.trim().replace(/^:\s*/, "")
      : undefined;
    title = (body.message as string) || (event.title as string) || exceptionTitle || "Unknown error";
    culprit = (event.culprit as string) ?? "";
    permalink = (body.url as string) ?? "";
    level = (body.level as string) ?? "error";
    timestamp = Date.now();
  } else {
    return NextResponse.json({ ok: true });
  }

  const logsUrl = buildVercelLogsUrl(timestamp);
  const emoji = level === "fatal" ? ":red_circle:" : ":large_orange_circle:";
  const text = `${emoji} *${title}*\n>${culprit}\n\n<${permalink}|View in Sentry>   |   <${logsUrl}|Vercel Logs (±5 min)>`;

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${slackToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
  });

  return NextResponse.json({ ok: true });
}
