// backend/src/emails/templates/welcomeEmail.js

const { renderBaseLayout } = require("../baseLayout");

function buildWelcomeEmail(params) {
  const { userName, appUrl, unsubscribeUrl } = params;

  const title = "Welcome to HuskyTrack 🎉";
  const greetingName = userName || "there";

  const bodyHtml = `
    <p>Hi ${greetingName},</p>
    <p>
      Welcome to <strong>HuskyTrack</strong> your new platform for discovering,
      managing, and attending campus events.
    </p>
    <p>
      Explore upcoming events, register with one click, and stay informed with event updates.
    </p>
    <p style="margin-top:16px;">Your dashboard is ready whenever you are!</p>
  `;

  const html = renderBaseLayout({
    title,
    preheader: "Welcome to HuskyTrack — your campus event companion.",
    bodyHtml,
    primaryCtaLabel: "Go to Dashboard",
    primaryCtaUrl: appUrl,
    unsubscribeUrl,
  });

  const text = [
    `Hi ${greetingName},`,
    "",
    "Welcome to HuskyTrack — your new home for campus events.",
    "",
    `Get started here: ${appUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");

  return {
    subject: "Welcome to HuskyTrack 🎉",
    html,
    text,
  };
}

module.exports = {
  buildWelcomeEmail,
};
