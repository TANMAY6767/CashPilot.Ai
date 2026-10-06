import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

async function sendEmail({ email, orgName, inviterName, token }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173")
    .trim()
    .replace(/\/+$/, "");
  const invitationUrl = `${frontendUrl}/invitations/accept?token=${encodeURIComponent(token)}`;
  const safeOrgName = escapeHtml(orgName);
  const safeInviterName = escapeHtml(inviterName);

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.INVITATION_EMAIL_FROM || "CashFlow <noreply@tanmaydhole.in>",
    to: email,
    subject: `You're invited to join ${orgName}`,
    html: `
      <h2>You've been invited!</h2>
      <p>${safeInviterName} has invited you to join <strong>${safeOrgName}</strong> on CashFlow.</p>
      <a href="${invitationUrl}"
         style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
        Accept Invitation
      </a>
      <p>This invitation expires in 7 days.</p>
    `,
  });

  if (error) {
    throw new Error(error.message || "Email provider rejected the invitation.");
  }

  if (!data?.id) {
    throw new Error("Email provider did not confirm delivery.");
  }

  return data;
}

export { sendEmail };
