// backend/src/emails/templates/passwordResetEmail.js

const { renderBaseLayout } = require("../baseLayout");

function buildPasswordResetEmail(params) {
  const { userName, resetUrl, unsubscribeUrl } = params;

  const title = "Reset Your Password";
  const greetingName = userName || "there";

  const bodyHtml = `
    <p>Hi ${greetingName},</p>
    <p>
      We received a request to reset your HuskyTrack password.
    </p>

    <p>
      To continue, click the button below.  
      If you didn’t request this, you can safely ignore this email.
    </p>

    <p style="margin-top: 16px; font-size: 14px; color: #6b7280;">
      <strong>This password reset link will expire in 30 minutes.</strong>
    </p>
  `;

  const html = renderBaseLayout({
    title,
    preheader: "Reset your HuskyTrack password.",
    bodyHtml,
    primaryCtaLabel: "Reset Password",
    primaryCtaUrl: resetUrl,
    unsubscribeUrl,
  });

  const text = [
    `Hi ${greetingName},`,
    "",
    "We received a request to reset your HuskyTrack password.",
    "",
    `Reset your password using this link:`,
    `${resetUrl}`,
    "",
    "If you didn’t make this request, please ignore this message.",
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return {
    subject: "Reset Your HuskyTrack Password",
    html,
    text,
  };
}

module.exports = {
  buildPasswordResetEmail,
};
