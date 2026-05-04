// backend/src/routes/emailPreviewRoute.js

const express = require("express");
const router = express.Router();

const { buildEmail } = require("../emails");
const { EmailTemplateId } = require("../emails/types");

router.get("/email-preview", (req, res) => {
  const type = req.query.type || EmailTemplateId.WELCOME;

  // Base preview variables
  const baseParams = {
    userName: "Aayushi",
    unsubscribeUrl: "https://huskytrack.app/unsubscribe/preview",
  };

  // Event-related preview parameters
  const eventData = {
    eventName: "HuskyTrack Info Session",
    eventDate: "Sat, Dec 7 · 3:00 PM EST",
    eventLocation: "Snell Library 101",
    eventUrl: "https://huskytrack.app/events/preview",
  };

  let params = { ...baseParams };

  // Determine which template parameters to send
  if (
    type === EmailTemplateId.REGISTRATION_CONFIRMATION ||
    type === EmailTemplateId.EVENT_REMINDER ||
    type === EmailTemplateId.EVENT_UPDATE ||
    type === EmailTemplateId.EVENT_CANCELLATION
  ) {
    params = { ...params, ...eventData };
  }

  if (type === EmailTemplateId.PASSWORD_RESET) {
    params.resetUrl = "https://huskytrack.app/reset-password/preview";
  }

  if (type === EmailTemplateId.WELCOME) {
    params.appUrl = "http://localhost:5173/app";
  }

  try {
    const email = buildEmail(type, params);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(email.html);
  } catch (err) {
    console.error(err);
    res.status(400).send(`Invalid template type: ${type}`);
  }
});

module.exports = router;
