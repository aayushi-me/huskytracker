// backend/src/emails/index.js

const { EmailTemplateId } = require("./types");

const { buildWelcomeEmail } = require("./templates/welcomeEmail");
const {
  buildRegistrationConfirmationEmail,
} = require("./templates/registrationConfirmationEmail");
const { buildEventReminderEmail } = require("./templates/eventReminderEmail");
const { buildEventUpdateEmail } = require("./templates/eventUpdateEmail");
const {
  buildEventCancellationEmail,
} = require("./templates/eventCancellationEmail");
const {
  buildPasswordResetEmail,
} = require("./templates/passwordResetEmail");

/**
 * Build email HTML + text + subject based on templateId.
 */
function buildEmail(templateId, params) {
  switch (templateId) {
    case EmailTemplateId.WELCOME:
      return buildWelcomeEmail(params);

    case EmailTemplateId.REGISTRATION_CONFIRMATION:
      return buildRegistrationConfirmationEmail(params);

    case EmailTemplateId.EVENT_REMINDER:
      return buildEventReminderEmail(params);

    case EmailTemplateId.EVENT_UPDATE:
      return buildEventUpdateEmail(params);

    case EmailTemplateId.EVENT_CANCELLATION:
      return buildEventCancellationEmail(params);

    case EmailTemplateId.PASSWORD_RESET:
      return buildPasswordResetEmail(params);

    default:
      throw new Error(`Unknown email template: ${templateId}`);
  }
}

module.exports = {
  buildEmail,
};
