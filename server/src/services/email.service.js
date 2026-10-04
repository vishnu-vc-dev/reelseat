const env = require('../config/env');

const BREVO_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

/**
 * Messages "sent" while no provider is configured. Tests read OTPs from here,
 * and in local development the content is printed to the console instead.
 * @type {{ to: string, subject: string, html: string, text?: string, attachments?: object[] }[]}
 */
const outbox = [];

/**
 * Sends a transactional email through Brevo's HTTP API.
 *
 * An HTTP API is used rather than SMTP because many PaaS free tiers block
 * outbound SMTP ports; HTTPS on 443 always works.
 *
 * @param {{
 *   to: string,
 *   toName?: string,
 *   subject: string,
 *   html: string,
 *   text?: string,
 *   attachments?: { name: string, content: string }[]  base64 content
 * }} message
 */
async function sendEmail(message) {
  if (!env.email.brevoApiKey) {
    outbox.push(message);
    if (!env.isTest) {
      console.log(`[email:dev] to=${message.to} subject="${message.subject}"\n${message.text || ''}`);
    }
    return { id: `dev-${outbox.length}` };
  }

  const response = await fetch(BREVO_ENDPOINT, {
    method: 'POST',
    headers: {
      'api-key': env.email.brevoApiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: env.email.fromName, email: env.email.from },
      to: [{ email: message.to, name: message.toName || message.to }],
      subject: message.subject,
      htmlContent: message.html,
      textContent: message.text,
      ...(message.attachments?.length && { attachment: message.attachments }),
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Email provider responded ${response.status}: ${body.slice(0, 200)}`);
  }
  const data = await response.json();
  return { id: data.messageId };
}

module.exports = { sendEmail, outbox };
