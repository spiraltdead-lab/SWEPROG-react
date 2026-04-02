'use strict';

/**
 * Email service — two transports:
 *   1. contactTransporter  → hello@sweprog.se  (human replies welcome)
 *   2. noReplyTransporter  → noreply@sweprog.se (automated mail)
 *
 * DNS records required for deliverability (configure at your DNS provider):
 *   SPF:   TXT  "@"  "v=spf1 mx include:mail.sweprog.se ~all"
 *   DKIM:  Set up in cPanel → Email → Email Deliverability (auto-signs outgoing mail)
 *   DMARC: TXT  "_dmarc"  "v=DMARC1; p=quarantine; rua=mailto:hello@sweprog.se"
 *
 * NOTE: To send FROM noreply@sweprog.se, either:
 *   a) Create the mailbox noreply@sweprog.se and set EMAIL_NOREPLY / EMAIL_NOREPLY_PASS in .env
 *   b) Or configure your mail server to allow hello@sweprog.se to send as noreply@sweprog.se
 *
 * .env variables:
 *   EMAIL_HOST        mail.sweprog.se
 *   EMAIL_PORT        465
 *   EMAIL_USER        hello@sweprog.se
 *   EMAIL_PASS        <password>
 *   EMAIL_NOREPLY     noreply@sweprog.se   (optional, defaults to EMAIL_USER)
 *   EMAIL_NOREPLY_PASS <password>          (optional, defaults to EMAIL_PASS)
 */

const nodemailer = require('nodemailer');
const { tEmail }  = require('../i18n');

// ─── Transporters ─────────────────────────────────────────────────────────────

function makeTransport(user, pass) {
  return nodemailer.createTransport({
    host:    process.env.EMAIL_HOST,
    port:    parseInt(process.env.EMAIL_PORT || '465'),
    secure:  true,
    auth:    { user, pass },
    pool:    true,
    maxConnections: 3,
    rateDelta: 1000,
    rateLimit: 5
  });
}

// Transporter for contact form — replies go back to the user
const contactTransporter = makeTransport(process.env.EMAIL_USER, process.env.EMAIL_PASS);

// Transporter for automated mail (password reset etc.) — noreply@sweprog.se
const noReplyUser = process.env.EMAIL_NOREPLY     || process.env.EMAIL_USER;
const noReplyPass = process.env.EMAIL_NOREPLY_PASS || process.env.EMAIL_PASS;
const noReplyTransporter = makeTransport(noReplyUser, noReplyPass);

// ─── Shared HTML helpers ──────────────────────────────────────────────────────

/** Escapes < > & " for safe HTML embedding of user-supplied text */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── sendContactEmail ─────────────────────────────────────────────────────────

/**
 * Sends a contact-form message to hello@sweprog.se.
 * @param {{ name: string, email: string, message: string, offer?: string }} data
 */
async function sendContactEmail({ name, email, message, offer }) {
  const offerRow = offer
    ? `<tr>
         <td style="padding:8px 0 8px 0;color:#64748b;font-size:13px;width:140px">Intresserat paket</td>
         <td style="padding:8px 0;font-weight:600;color:#1e293b">${esc(offer)}</td>
       </tr>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="sv">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%">
        <!-- Header -->
        <tr><td style="background:#667eea;border-radius:12px 12px 0 0;padding:32px 40px">
          <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700">Ny kontaktförfrågan</h1>
          <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:13px">via sweprog.se</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:32px 40px;border-radius:0 0 12px 12px">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin-bottom:20px">
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px;width:140px">Namn</td>
              <td style="padding:8px 0;font-weight:600;color:#1e293b">${esc(name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#64748b;font-size:13px">E-post</td>
              <td style="padding:8px 0"><a href="mailto:${esc(email)}" style="color:#667eea;text-decoration:none">${esc(email)}</a></td>
            </tr>
            ${offerRow}
          </table>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px">
          <p style="color:#64748b;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.5px">Meddelande</p>
          <p style="color:#1e293b;font-size:15px;line-height:1.8;margin:0;white-space:pre-wrap">${esc(message)}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px">
          <p style="color:#94a3b8;font-size:12px;margin:0">Svara direkt på det här mejlet för att nå avsändaren.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `Ny kontaktförfrågan via sweprog.se\n\nNamn: ${name}\nE-post: ${email}${offer ? `\nPaket: ${offer}` : ''}\n\nMeddelande:\n${message}`;

  await contactTransporter.sendMail({
    from:    `"SWEPROG Kontakt" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_USER,
    replyTo: `"${name}" <${email}>`,
    subject: `Ny förfrågan från ${name}${offer ? ` – ${offer}` : ''}`,
    html,
    text
  });
}

// ─── sendPasswordResetEmail ───────────────────────────────────────────────────

/**
 * Sends a password-reset email in the user's language.
 *
 * @param {{ email: string, resetUrl: string, lang?: string }} data
 */
async function sendPasswordResetEmail({ email, resetUrl, lang = 'sv' }) {
  const t   = (key) => tEmail(lang, `resetPassword.${key}`);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const safeResetUrl = esc(resetUrl);

  const html = `<!DOCTYPE html>
<html lang="${esc(lang)}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t('subject')}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->

  <!-- Preheader (hidden preview text in email clients) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">
    ${esc(t('preheader'))}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600"
             style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:#667eea;border-radius:12px 12px 0 0;padding:32px 40px;text-align:${dir === 'rtl' ? 'right' : 'left'}">
          <p style="color:#fff;margin:0;font-size:13px;font-weight:400;letter-spacing:.5px">SWEPROG</p>
          <h1 style="color:#fff;margin:8px 0 0;font-size:22px;font-weight:700">${t('title')}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:36px 40px 28px;border-radius:0 0 12px 12px">
          <p style="color:#475569;font-size:15px;line-height:1.8;margin:0 0 8px">${t('greeting')}</p>
          <p style="color:#1e293b;font-size:15px;line-height:1.8;margin:0 0 32px">${t('body')}</p>

          <!-- CTA button -->
          <table role="presentation" cellpadding="0" cellspacing="0"
                 style="margin:0 auto 32px;${dir === 'rtl' ? '' : ''}">
            <tr><td align="center" style="border-radius:8px;background:#667eea">
              <a href="${safeResetUrl}"
                 target="_blank"
                 style="display:inline-block;padding:14px 36px;background:#667eea;border-radius:8px;
                        color:#fff;font-size:15px;font-weight:700;text-decoration:none;
                        font-family:Arial,Helvetica,sans-serif;line-height:1">
                ${t('button')}
              </a>
            </td></tr>
          </table>

          <!-- Expiry + ignore note -->
          <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0 0 8px">
            ${t('expiry')}
          </p>
          <p style="color:#64748b;font-size:13px;line-height:1.7;margin:0 0 24px">
            ${t('ignoreNote')}
          </p>

          <!-- Spam folder notice -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;
                           padding:12px 16px;color:#92400e;font-size:13px;line-height:1.6">
              ${t('spamNote')}
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px">

          <!-- Plain fallback URL -->
          <p style="color:#94a3b8;font-size:11px;margin:0 0 4px">${t('linkLabel')}</p>
          <p style="color:#94a3b8;font-size:11px;margin:0;word-break:break-all">
            <a href="${safeResetUrl}" style="color:#94a3b8">${safeResetUrl}</a>
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;text-align:center">
          <p style="color:#94a3b8;font-size:11px;margin:0">${t('footer')}</p>
          <p style="color:#cbd5e1;font-size:11px;margin:4px 0 0">&copy; ${new Date().getFullYear()} SWEPROG AB</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
  <!--[if mso]></td></tr></table><![endif]-->
</body></html>`;

  const text = [
    `${t('greeting')}`,
    '',
    t('body'),
    '',
    `${t('button')}: ${resetUrl}`,
    '',
    t('expiry'),
    t('ignoreNote'),
    '',
    t('spamNote'),
    '',
    `${t('linkLabel')} ${resetUrl}`,
    '',
    `-- ${t('footer')} SWEPROG AB`
  ].join('\n');

  await noReplyTransporter.sendMail({
    from:    `"SWEPROG" <${noReplyUser}>`,
    to:      email,
    subject: t('subject'),
    html,
    text,
    headers: {
      'X-Mailer':            'SWEPROG Mailer',
      'List-Unsubscribe':    `<mailto:${noReplyUser}?subject=unsubscribe>`,
      'X-Priority':          '3',
      'Precedence':          'bulk'
    }
  });
}

// ─── sendWelcomeEmail ─────────────────────────────────────────────────────────

/**
 * Sends a welcome email to a newly registered user.
 * @param {{ name: string, email: string, lang?: string }} data
 */
async function sendWelcomeEmail({ name, email, lang = 'sv' }) {
  const raw = (key) => tEmail(lang, `welcome.${key}`);
  const t   = (key) => raw(key).replace('{{name}}', esc(name));
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const loginUrl = esc(`${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`);

  const html = `<!DOCTYPE html>
<html lang="${esc(lang)}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${t('subject')}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif">
  <!-- Preheader -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">
    ${t('preheader')}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%"
         style="background:#f1f5f9;padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600"
             style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="background:#667eea;border-radius:12px 12px 0 0;padding:32px 40px;text-align:${dir === 'rtl' ? 'right' : 'left'}">
          <p style="color:#fff;margin:0;font-size:13px;letter-spacing:.5px">SWEPROG</p>
          <h1 style="color:#fff;margin:8px 0 0;font-size:24px;font-weight:700">${t('title')}</h1>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#fff;padding:36px 40px 28px;border-radius:0 0 12px 12px">
          <p style="color:#475569;font-size:15px;line-height:1.8;margin:0 0 8px">${t('greeting')}</p>
          <p style="color:#1e293b;font-size:15px;line-height:1.8;margin:0 0 32px">${t('body')}</p>

          <!-- CTA -->
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 32px">
            <tr><td align="center" style="border-radius:8px;background:#667eea">
              <a href="${loginUrl}" target="_blank"
                 style="display:inline-block;padding:14px 36px;background:#667eea;border-radius:8px;
                        color:#fff;font-size:15px;font-weight:700;text-decoration:none;
                        font-family:Arial,Helvetica,sans-serif;line-height:1">
                ${t('loginButton')}
              </a>
            </td></tr>
          </table>

          <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 16px">
          <p style="color:#94a3b8;font-size:12px;margin:0">${t('spamNote')}</p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;text-align:center">
          <p style="color:#94a3b8;font-size:11px;margin:0">${t('footer')}</p>
          <p style="color:#cbd5e1;font-size:11px;margin:4px 0 0">&copy; ${new Date().getFullYear()} SWEPROG AB</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    t('greeting'), '',
    t('body'), '',
    `${t('loginButton')}: ${process.env.FRONTEND_URL || 'http://localhost:4200'}/login`,
    '', t('spamNote'), '', `-- ${t('footer')} SWEPROG AB`
  ].join('\n');

  await noReplyTransporter.sendMail({
    from:    `"SWEPROG" <${noReplyUser}>`,
    to:      email,
    subject: t('subject'),
    html,
    text,
    headers: {
      'X-Mailer':   'SWEPROG Mailer',
      'X-Priority': '3',
      'Precedence': 'bulk'
    }
  });
}

module.exports = { sendContactEmail, sendPasswordResetEmail, sendWelcomeEmail };
