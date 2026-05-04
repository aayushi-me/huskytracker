// backend/src/emails/templates/eventReminderEmail.js

const { renderBaseLayout } = require("../baseLayout");

function buildEventReminderEmail(params) {
  const {
    userName,
    eventName,
    eventDate,
    eventLocation,
    eventUrl,
    unsubscribeUrl,
  } = params;

  const title = "Upcoming Event Reminder";
  const greetingName = userName || "there";

  const locationLine = eventLocation
    ? `<p><strong>Location:</strong> ${eventLocation}</p>`
    : "";

  const bodyHtml = `
    <p>Hi ${greetingName},</p>
    <p>
      This is a friendly reminder about your upcoming event:
      <strong>${eventName}</strong>.
    </p>
    <p><strong>Date & Time:</strong> ${eventDate}</p>
    ${locationLine}
    <p style="margin-top:16px;">
      You can review details, directions, and any updates on the event page.
    </p>
  `;

  const html = renderBaseLayout({
    title,
    preheader: `Reminder: ${eventName} is coming up soon.`,
    bodyHtml,
    primaryCtaLabel: "View Event",
    primaryCtaUrl: eventUrl,
    unsubscribeUrl,
  });

  const text = [
    `Hi ${greetingName},`,
    "",
    `Reminder: "${eventName}" is coming up soon.`,
    "",
    `Date & Time: ${eventDate}`,
    eventLocation ? `Location: ${eventLocation}` : "",
    "",
    `View event: ${eventUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Reminder: ${eventName}`,
    html,
    text,
  };
}

module.exports = {
  buildEventReminderEmail,
};
