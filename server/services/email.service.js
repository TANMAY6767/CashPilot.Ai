import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({
    email,
    teamName,
    inviterName,
    token,
}) {
  try {
    const invitationUrl =
        `http://localhost:8000/team/invite/accept/${token}`;
    const { data, error } = await resend.emails.send({
      from: 'CashFlow <noreply@tanmaydhole.in>',
      to: email,
      subject: `You're invited to join ${teamName}`,
      html: `
            <h2>You've been invited!</h2>

            <p>
                ${inviterName} has invited you to join
                <strong>${teamName}</strong> on CashFlow.
            </p>

            <a
                href="${invitationUrl}"
                style="
                    display:inline-block;
                    padding:12px 20px;
                    background:#000;
                    color:#fff;
                    text-decoration:none;
                    border-radius:6px;
                "
            >
                Accept Invitation
            </a>

            <p>
                This invitation expires in 7 days.
            </p>
        `,
    });

    if (error) {
      console.error('Resend error:', error);
      return;
    }

    console.log('Email sent! ID:', data.id);
  } catch (err) {
    console.error('Failed to send:', err);
  }
}

export {sendEmail};