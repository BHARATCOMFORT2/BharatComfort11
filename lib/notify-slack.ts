// lib/notify-slack.ts

/**
 * Advanced Slack Notification Utility
 * -----------------------------------
 * Supports styled notifications with color codes and emojis.
 *
 * Usage:
 *  await notifySlack({
 *    title: "New Partner Approved",
 *    message: "Partner: GoaComfort Pvt Ltd (ID: P12345)",
 *    type: "success",
 *  });
 */

export type SlackNotifyType = "success" | "error" | "info" | "warning";

interface SlackMessage {
  title: string;
  message: string;
  type?: SlackNotifyType;
  meta?: Record<string, any>;
}

export async function notifySlack({ title, message, type = "info", meta }: SlackMessage) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn("⚠️ SLACK_WEBHOOK_URL missing — skipping Slack notification.");
    return;
  }

  // 🎨 Color mapping
  const colorMap = {
    success: "#36a64f", // green
    error: "#e01e5a",   // red
    info: "#439FE0",    // blue
    warning: "#f2c744", // yellow
  } as const;

  // 🧩 Emoji mapping
  const emojiMap = {
    success: "✅",
    error: "🚨",
    info: "ℹ️",
    warning: "⚠️",
  } as const;

  const color = colorMap[type] || colorMap.info;
  const emoji = emojiMap[type] || emojiMap.info;

  // 🧾 Optional meta fields (e.g., admin, timestamp, ID)
  const metaText =
    meta && Object.keys(meta).length > 0
      ? Object.entries(meta)
          .map(([key, val]) => `• *${key}:* ${val}`)
          .join("\n")
      : "";

  const payload = {
    attachments: [
      {
        color,
        pretext: `${emoji} *${title}*`,
        text: `${message}\n${metaText ? `\n${metaText}` : ""}`,
        footer: "BHARATCOMFORT11 Admin System",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error("❌ Failed to send Slack message:", await res.text());
    } else {
      console.log("✅ Slack message sent successfully.");
    }
  } catch (err) {
    console.error("🚨 Slack notify error:", err);
  }
}
// add this at the very bottom
export const sendSlackAlert = notifySlack;
