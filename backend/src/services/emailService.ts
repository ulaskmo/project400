import nodemailer, { Transporter } from "nodemailer";

function readSmtpConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@chainshield.local",
    fromName: process.env.EMAIL_FROM_NAME || "ChainShield",
  };
}

export function isEmailConfigured(): boolean {
  const c = readSmtpConfig();
  return Boolean(c.host && c.user && c.pass);
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  const c = readSmtpConfig();
  if (!c.host || !c.user || !c.pass) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: c.host,
      port: c.port,
      secure: c.port === 465,
      auth: { user: c.user, pass: c.pass },
    });
    console.log(`[Email] SMTP configured: ${c.host}:${c.port} as ${c.from}`);
  }
  return transporter;
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const t = getTransporter();
  if (!t) {
    // Refuse to silently succeed: we must never log a valid reset token
    // to stdout in a deployed environment, and we must not tell the user
    // "check your email" when no email will arrive.
    console.error(
      "[Email] SMTP is not configured. Cannot send password reset email."
    );
    throw new Error(
      "Password reset is unavailable: email service is not configured."
    );
  }

  const subject = "Reset your ChainShield password";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#f5f5f4;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,0.05);border:1px solid #e7e5e4;">
      <h1 style="margin:0 0 16px 0;font-size:22px;color:#1c1917;font-weight:600;">Reset your password</h1>
      <p style="margin:0 0 20px 0;color:#57534e;font-size:15px;line-height:1.6;">
        Someone (hopefully you) requested a password reset for your ChainShield account.
        Click the button below to choose a new password.
      </p>
      <div style="margin:28px 0;">
        <a href="${resetUrl}"
          style="display:inline-block;background:#8b5a3c;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">
          Reset Password
        </a>
      </div>
      <p style="margin:0 0 12px 0;color:#78716c;font-size:13px;line-height:1.5;">
        Or copy and paste this link into your browser:
      </p>
      <p style="margin:0 0 24px 0;color:#57534e;font-size:12px;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
        ${resetUrl}
      </p>
      <div style="padding-top:20px;border-top:1px solid #e7e5e4;">
        <p style="margin:0;color:#a8a29e;font-size:12px;line-height:1.5;">
          This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
    <p style="text-align:center;margin:20px 0 0 0;color:#a8a29e;font-size:12px;">
      ChainShield — Self-Sovereign Identity Platform
    </p>
  </div>
</body>
</html>
`;

  const text = `Reset your ChainShield password

Someone requested a password reset for your ChainShield account.

Open this link to choose a new password:
${resetUrl}

This link expires in 1 hour. If you didn't request a reset, ignore this email.
`;

  const c = readSmtpConfig();
  try {
    await t.sendMail({
      from: `"${c.fromName}" <${c.from}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`[Email] Sent password reset to ${to}`);
  } catch (err) {
    console.error(`[Email] Failed to send to ${to}:`, err);
    throw new Error("Could not send reset email");
  }
}
