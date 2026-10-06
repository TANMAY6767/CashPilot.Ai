import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

async function sendEmail({ email, orgName, inviterName, token }) {
  try {
    // ✅ Points to the frontend, not the backend
    const invitationUrl =
      `${FRONTEND_URL}/invitations/accept?token=${encodeURIComponent(token)}`;

    const { data, error } = await resend.emails.send({
      from: "CashFlow <noreply@tanmaydhole.in>",
      to: email,
      subject: `You're invited to join ${orgName}`,
      html: `
        <h2>You've been invited!</h2>
        <p>${inviterName} has invited you to join <strong>${orgName}</strong> on CashFlow.</p>
        <a href="${invitationUrl}"
           style="display:inline-block;padding:12px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
          Accept Invitation
        </a>
        <p>This invitation expires in 7 days.</p>
      `,
    });

    if (error) return console.error("Resend error:", error);
    console.log("Email sent! ID:", data.id);
  } catch (err) {
    console.error("Failed to send:", err);
  }
}

export { sendEmail };