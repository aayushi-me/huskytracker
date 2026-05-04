// backend/src/emails/templates/eventUpdateEmail.js

const { renderBaseLayout } = require("../baseLayout");

function buildEventUpdateEmail(params) {
  const {
    userName,
    eventName,
    eventDate,
    eventLocation,
    eventUrl,
    unsubscribeUrl,
  } = params;

  const title = "Event Update Notification";
  const greetingName = userName || "there";

  const locationLine = eventLocation
    ? `<p><strong>New Location:</strong> ${eventLocation}</p>`
    : "";

  const bodyHtml = `
    <p>Hi ${greetingName},</p>
    <p>
      There has been an important update to your event:
      <strong>${eventName}</strong>.
    </p>
    <p><strong>Updated Date & Time:</strong> ${eventDate}</p>
    ${locationLine}
    <p style="margin-top:16px;">
      You can review all updates and details on the event page.
    </p>
  `;

  const html = renderBaseLayout({
    title,
    preheader: `Update: ${eventName} has new event details.`,
    bodyHtml,
    primaryCtaLabel: "View Updated Event",
    primaryCtaUrl: eventUrl,
    unsubscribeUrl,
  });

  const text = [
    `Hi ${greetingName},`,
    "",
    `There is an update to your event: "${eventName}".`,
    "",
    `Updated Date & Time: ${eventDate}`,
    eventLocation ? `New Location: ${eventLocation}` : "",
    "",
    `View event: ${eventUrl}`,
    "",
    `Unsubscribe: ${unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Update: ${eventName}`,
    html,
    text,
  };
}

module.exports = {
  buildEventUpdateEmail,
};
