import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();
const resend = new Resend(process.env.resend_api_key);

async function sendEmail() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'tanmayt36y@gmail.com',
      subject: 'Hello World',
      html: '<p>Congrats on sending your <strong>first email</strong>!</p>'
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

sendEmail();