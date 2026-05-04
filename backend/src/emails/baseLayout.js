// backend/src/emails/baseLayout.js

function renderBaseLayout({
  title,
  preheader = "HuskyTrack notification – stay updated on your campus events.",
  bodyHtml,
  primaryCtaLabel,
  primaryCtaUrl,
  unsubscribeUrl,
}) {
  const HUSKYTRACK_PRIMARY = "#5b21b6"; // purple
  const HUSKYTRACK_ACCENT = "#f97316";  // orange

  const primaryButtonHtml =
    primaryCtaLabel && primaryCtaUrl
      ? `
      <tr>
        <td align="center" style="padding: 24px 0 8px 0;">
          <a href="${primaryCtaUrl}"
             style="
               display: inline-block;
               padding: 12px 24px;
               border-radius: 999px;
               background-color: ${HUSKYTRACK_PRIMARY};
               color: #ffffff;
               font-size: 15px;
               font-weight: 600;
               text-decoration: none;
             ">
            ${primaryCtaLabel}
          </a>
        </td>
      </tr>
    `
      : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <style>
    body { margin:0; padding:0; background-color:#f3f4f6; }
    .email-wrapper { width: 100%; background-color: #f3f4f6; padding: 24px 0; }
    .email-container {
      width:100%; max-width:600px; margin:0 auto; background-color:#fff;
      border-radius:16px; overflow:hidden; box-shadow:0 10px 25px rgba(15,23,42,0.08);
    }
    .email-header {
      padding:24px 24px 12px; 
      background: radial-gradient(circle at top left, ${HUSKYTRACK_ACCENT}, ${HUSKYTRACK_PRIMARY});
      color:white;
    }
    .email-body { padding:24px; font-family:system-ui; color:#111827; font-size:15px; line-height:1.6; }
    .divider { height:1px; background:linear-gradient(to right, transparent, #e5e7eb, transparent); margin:20px 0; }
    .email-footer { font-family:system-ui; color:#6b7280; font-size:12px; padding:16px 24px; text-align:center; }
    .social-links a { margin:0 8px; color:#6b7280; text-decoration:none; }
  </style>
</head>

<body>
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    ${preheader}
  </div>

  <table class="email-wrapper" role="presentation">
    <tr><td align="center">

      <table class="email-container" role="presentation">

        <tr>
          <td class="email-header">
            <h1 style="margin:0;font-size:22px;font-weight:700;">HuskyTrack</h1>
            <span style="opacity:0.9;">${title}</span>
          </td>
        </tr>

        <tr>
          <td class="email-body">
            ${bodyHtml}
            ${primaryButtonHtml}
            <div class="divider"></div>
            <p style="font-size:13px;color:#6b7280;">
              You’re receiving this email because you have a HuskyTrack account.
            </p>
          </td>
        </tr>

        <tr>
          <td class="email-footer">
            <p style="margin:0;">
              © ${new Date().getFullYear()} HuskyTrack. All rights reserved.
            </p>
          </td>
        </tr>

      </table>

    </td></tr>
  </table>
</body>
</html>
`;
}

module.exports = { renderBaseLayout };
