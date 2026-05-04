// backend/src/emails/templates/registrationConfirmationEmail.js

const { renderBaseLayout } = require("../baseLayout");

function buildRegistrationConfirmationEmail(params) {
  const {
    userName,
    eventName,
    eventDate,
    eventLocation,
    eventUrl,
    unsubscribeUrl,
  } = params;

  const title = "Your registration is confirmed";
  const greetingName = userName || "there";

  const locationLine = eventLocation
    ? `<p><strong>Location:</strong> ${eventLocation}</p>`
    : "";

  const bodyHtml = `
    <p>Hi ${greetingName},</p>
    <p>
      You’re all set! Your registration for
      <strong>${eventName}</strong> is confirmed.
    </p>
    <p><strong>Date & Time:</strong> ${eventDate}</p>
    ${locationLine}
    <p style="margin-top:16px;">
      You can view full event details, directions, and updates on the event page.
    </p>
  `;

  const html = renderBaseLayout({
    title,
    preheader: `Your registration for ${eventName} is confirmed.`,
    bodyHtml,
    primaryCtaLabel: "View Event",
    primaryCtaUrl: eventUrl,
    unsubscribeUrl,
  });

  const textLines = [
    `Hi ${greetingName},`,
    "",
    `Your registration for "${eventName}" is confirmed.`,
    "",
    `Date & Time: ${eventDate}`,
  ];

  if (eventLocation) {
    textLines.push(`Location: ${eventLocation}`);
  }

  textLines.push(
    "",
    `View event details: ${eventUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`
  );

  return {
    subject: `Registration Confirmed: ${eventName}`,
    html,
    text: textLines.join("\n"),
  };
}

module.exports = {
  buildRegistrationConfirmationEmail,
};
