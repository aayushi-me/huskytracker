// backend/src/emails/types.js

/**
 * These identifiers tell our email builder which template to generate.
 * In JS we do not use TypeScript types, so this file only documents valid template IDs.
 */

const EmailTemplateId = {
  WELCOME: "welcome",
  REGISTRATION_CONFIRMATION: "registration_confirmation",
  EVENT_REMINDER: "event_reminder",
  EVENT_UPDATE: "event_update",
  EVENT_CANCELLATION: "event_cancellation",
  PASSWORD_RESET: "password_reset",
};

module.exports = {
  EmailTemplateId,
};
