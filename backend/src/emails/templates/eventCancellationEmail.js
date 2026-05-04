// backend/src/emails/templates/eventCancellationEmail.js

const { renderBaseLayout } = require("../baseLayout");

function buildEventCancellationEmail(params) {
  const {
    userName,
    eventName,
    eventDate,
    eventLocation,
    eventUrl,
    unsubscribeUrl,
  } = params;

  const title = "Event Cancellation Notice";
  const greetingName = userName || "there";

  const locationLine = eventLocation
    ? `<p><strong>Original Location:</strong> ${eventLocation}</p>`
    : "";

  const bodyHtml = `
    <p>Hi ${greetingName},</p>
    <p>
      We’re sorry to inform you that the event
      <strong>${eventName}</strong> has been cancelled.
    </p>
    <p><strong>Originally Scheduled For:</strong> ${eventDate}</p>
    ${locationLine}
    <p style="margin-top:16px;">
      If you'd like, you can explore other events happening on HuskyTrack.
    </p>
  `;

  const html = renderBaseLayout({
    title,
    preheader: `${eventName} has been cancelled.`,
    bodyHtml,
    primaryCtaLabel: "Browse Other Events",
    primaryCtaUrl: "https://huskytrack.app/events", // generic events list
    unsubscribeUrl,
  });

  const text = [
    `Hi ${greetingName},`,
    "",
    `The event "${eventName}" has been cancelled.`,
    "",
    `Originally planned for: ${eventDate}`,
    eventLocation ? `Original Location: ${eventLocation}` : "",
    "",
    "Browse other events: https://huskytrack.app/events",
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Cancelled: ${eventName}`,
    html,
    text,
  };
}

module.exports = {
  buildEventCancellationEmail,
};
