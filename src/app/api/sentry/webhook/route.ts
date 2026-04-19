import { NextRequest, NextResponse } from "next/server";

const SLACK_CHANNEL = "C0ASJHCE9AR"; // #kalooda-alerts
const VERCEL_PROJECT = "kalooda";
const VERCEL_TEAM = "vanguardtechnologies-team";

function buildVercelLogsUrl(timestamp: number): string {
  // Deep link to Vercel logs filtered to ±5 minutes around the error time
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

  // Sentry sends action + data.issue for issue alerts
  const action = body.action as string;
  if (action !== "created" && action !== "triggered") {
    return NextResponse.json({ ok: true }); // ignore non-alert events
  }

  const issue = (body.data as Record<string, unknown>)
    ?.issue as Record<string, unknown> | undefined;

  if (!issue) {
    return NextResponse.json({ ok: true });
  }

  const title = (issue.title as string) ?? "Unknown error";
  const culprit = (issue.culprit as string) ?? "";
  const permalink = (issue.permalink as string) ?? "";
  const firstSeen = issue.firstSeen as string | undefined;
  const timestamp = firstSeen ? new Date(firstSeen).getTime() : Date.now();
  const logsUrl = buildVercelLogsUrl(timestamp);
  const level = (issue.level as string) ?? "error";
  const emoji = level === "fatal" ? ":red_circle:" : ":large_orange_circle:";

  const text = `${emoji} *${title}*\n>${culprit}\n\n<${permalink}|View in Sentry>   |   <${logsUrl}|Vercel Logs (±5 min)>`;

  await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${slackToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text }),
  });

  return NextResponse.json({ ok: true });
}
