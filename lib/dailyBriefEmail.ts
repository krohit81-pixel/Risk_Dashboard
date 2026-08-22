// lib/dailyBriefEmail.ts
// V5.13 — sends the Daily Risk Brief PDF by email after the daily editorial cron generates it.
//
// Sender: reuses the SAME mailbox the newsletter-ingestion job (api/cron-bloomberg.py) already
// fetches from — IMAP_EMAIL / IMAP_PASSWORD (Vercel env vars are shared across the Python and
// Next.js functions in one project, so no new credentials needed). That mailbox is AOL, and
// AOL's SMTP (smtp.aol.com) accepts the same email + app-password used for IMAP — same
// authentication AOL requires for any third-party mail client. SMTP host/port are overridable
// (SMTP_HOST/SMTP_PORT) in case the mailbox ever moves off AOL.
//
// Recipient: DAILY_BRIEF_RECIPIENT_EMAIL (new var — set in Vercel, no default; sending is
// skipped, not failed, when unset — see sendDailyBrief's early return).
//
// Deliberately fail-soft, same philosophy as the rest of this app's generation pipeline: a
// failure here must NEVER fail the cron run itself (the snapshot already saved successfully
// before this runs) — callers get {ok:false, reason} back, not a throw.

import nodemailer from "nodemailer";

export interface SendDailyBriefResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
}

export async function sendDailyBriefEmail(pdf: Buffer, dateLabel: string): Promise<SendDailyBriefResult> {
  const to = process.env.DAILY_BRIEF_RECIPIENT_EMAIL;
  if (!to) {
    return { ok: false, skipped: true, reason: "DAILY_BRIEF_RECIPIENT_EMAIL not set" };
  }

  const user = process.env.IMAP_EMAIL || process.env.AOL_EMAIL;
  const pass = process.env.IMAP_PASSWORD || process.env.AOL_APP_PASSWORD;
  if (!user || !pass) {
    return { ok: false, skipped: true, reason: "IMAP_EMAIL/IMAP_PASSWORD not set (same mailbox used for newsletter ingestion)" };
  }

  const host = process.env.SMTP_HOST || "smtp.aol.com";
  const port = Number(process.env.SMTP_PORT || 465);

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // AOL: 465 = implicit TLS, 587 = STARTTLS
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: `"Risk Intelligence" <${user}>`,
      to,
      subject: `Daily Risk Brief — ${dateLabel}`,
      text: `Today's Daily Risk Brief is attached.\n\nPrepared by Rohit Kohli. Personal decision-support and learning tool — not investment advice, not Mizuho output.`,
      attachments: [
        {
          filename: `daily-risk-brief-${dateLabel.replace(/[^\w-]+/g, "-").toLowerCase()}.pdf`,
          content: pdf,
          contentType: "application/pdf",
        },
      ],
    });

    return { ok: true };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}
