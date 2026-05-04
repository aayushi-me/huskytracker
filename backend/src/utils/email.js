/**
 * Email Service
 * Handles sending emails for password reset, verification, and notifications
 * Integrated with SendGrid for email delivery
 */

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('SendGrid email service initialized');
} else {
    console.warn('WARNING: SENDGRID_API_KEY not found. Emails will be logged to console only.');
}

/**
 * Email configuration
 */
const EMAIL_CONFIG = {
    from: process.env.EMAIL_FROM || 'support@huskytracks.site',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@huskytracks.site',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
};

/**
 * Send email via SendGrid
 * @param {Object} emailData - Email data (to, from, subject, text, html)
 * @returns {Promise<Object>} Send result
 */
const sendEmailViaSendGrid = async (emailData) => {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            // Fallback to console logging if no API key
            console.log('\nEMAIL (No SendGrid API Key) - Logging to console');
            console.log('═══════════════════════════════════════');
            console.log('To:', emailData.to);
            console.log('From:', emailData.from);
            console.log('Subject:', emailData.subject);
            console.log('═══════════════════════════════════════\n');
            
            return {
                success: true,
                message: 'Email logged to console (no API key configured)',
                emailSent: false
            };
        }

        // Send via SendGrid
        const response = await sgMail.send(emailData);
        
        console.log(`Email sent successfully to ${emailData.to} (Subject: ${emailData.subject})`);
        
        return {
            success: true,
            message: 'Email sent successfully via SendGrid',
            emailSent: true,
            messageId: response[0].headers['x-message-id']
        };
    } catch (error) {
        console.error('SendGrid email error:', error.message);
        
        if (error.response) {
            console.error('SendGrid error details:', error.response.body);
        }
        
        return {
            success: false,
            message: 'Failed to send email',
            error: error.message,
            emailSent: false
        };
    }
};

/**
 * Send password reset email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email address
 * @param {String} options.resetToken - Password reset token
 * @param {String} options.userName - User's name
 * @returns {Promise<Object>} Email send result
 */
const sendPasswordResetEmail = async ({ to, resetToken, userName }) => {
    const resetUrl = `${EMAIL_CONFIG.frontendUrl}/reset-password/${resetToken}`;
    
    const emailContent = {
        to: to,
        from: EMAIL_CONFIG.from,
        subject: 'HuskyTrack - Password Reset Request',
        text: generatePasswordResetText(userName, resetUrl),
        html: generatePasswordResetHTML(userName, resetUrl)
    };
    
    // Send via SendGrid
    const result = await sendEmailViaSendGrid(emailContent);
    
    return {
        ...result,
        resetUrl: resetUrl
    };
};

/**
 * Send welcome/verification email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email address
 * @param {String} options.userName - User's name
 * @param {String} options.verificationToken - Email verification token (optional)
 * @returns {Promise<Object>} Email send result
 */
const sendWelcomeEmail = async ({ to, userName, verificationToken }) => {
    const verificationUrl = verificationToken 
        ? `${EMAIL_CONFIG.frontendUrl}/verify-email/${verificationToken}`
        : null;
    
    const emailContent = {
        to: to,
        from: EMAIL_CONFIG.from,
        subject: 'Welcome to HuskyTrack!',
        text: generateWelcomeText(userName, verificationUrl),
        html: generateWelcomeHTML(userName, verificationUrl)
    };
    
    // Send via SendGrid
    return await sendEmailViaSendGrid(emailContent);
};

/**
 * Send password changed confirmation email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email address
 * @param {String} options.userName - User's name
 * @returns {Promise<Object>} Email send result
 */
const sendPasswordChangedEmail = async ({ to, userName }) => {
    const emailContent = {
        to: to,
        from: EMAIL_CONFIG.from,
        subject: 'HuskyTrack - Password Changed Successfully',
        text: generatePasswordChangedText(userName),
        html: generatePasswordChangedHTML(userName)
    };
    
    // Send via SendGrid
    return await sendEmailViaSendGrid(emailContent);
};

// ============================================================================
// Email Templates
// ============================================================================

/**
 * Generate password reset email text content
 */
const generatePasswordResetText = (userName, resetUrl) => {
    return `
Hello ${userName},

You recently requested to reset your password for your HuskyTrack account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email or contact support if you have concerns.

Best regards,
The HuskyTrack Team
    `.trim();
};

/**
 * Generate password reset email HTML content
 */
const generatePasswordResetHTML = (userName, resetUrl) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #c8102e; margin-bottom: 20px;">Password Reset Request</h2>
        
        <p>Hello ${userName},</p>
        
        <p>You recently requested to reset your password for your HuskyTrack account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            Or copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #c8102e; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
            <strong>This link will expire in 1 hour.</strong>
        </p>
        
        <p style="font-size: 14px; color: #666;">
            If you did not request a password reset, please ignore this email or contact support if you have concerns.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
};

/**
 * Generate welcome email text content
 */
const generateWelcomeText = (userName, verificationUrl) => {
    let content = `
Hello ${userName},

Welcome to HuskyTrack! We're excited to have you on board.

HuskyTrack is your go-to platform for discovering and managing campus events.
    `;
    
    if (verificationUrl) {
        content += `

Please verify your email address by clicking the link below:
${verificationUrl}
        `;
    }
    
    content += `

If you have any questions, feel free to reach out to our support team.

Best regards,
The HuskyTrack Team
    `;
    
    return content.trim();
};

/**
 * Generate welcome email HTML content
 */
const generateWelcomeHTML = (userName, verificationUrl) => {
    let verificationSection = '';
    
    if (verificationUrl) {
        verificationSection = `
        <p>Please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verify Email
            </a>
        </div>
        `;
    }
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #c8102e; margin-bottom: 20px;">Welcome to HuskyTrack!</h2>
        
        <p>Hello ${userName},</p>
        
        <p>Welcome to HuskyTrack! We're excited to have you on board.</p>
        
        <p>HuskyTrack is your go-to platform for discovering and managing campus events.</p>
        
        ${verificationSection}
        
        <p>If you have any questions, feel free to reach out to our support team.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
};

/**
 * Generate password changed email text content
 */
const generatePasswordChangedText = (userName) => {
    return `
Hello ${userName},

Your HuskyTrack account password has been successfully changed.

If you did not make this change, please contact our support team immediately.

Best regards,
The HuskyTrack Team
    `.trim();
};

/**
 * Generate password changed email HTML content
 */
const generatePasswordChangedHTML = (userName) => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #c8102e; margin-bottom: 20px;">Password Changed Successfully</h2>
        
        <p>Hello ${userName},</p>
        
        <p>Your HuskyTrack account password has been successfully changed.</p>
        
        <p style="background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>If you did not make this change,</strong> please contact our support team immediately.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
};

/**
 * Send notification email (generic)
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email address
 * @param {String} options.userName - User's name
 * @param {String} options.subject - Email subject
 * @param {String} options.type - Notification type
 * @param {Object} options.data - Dynamic data for template
 * @returns {Promise<Object>} Email send result
 */
const sendNotificationEmail = async ({ to, userName, subject, type, data }) => {
    let emailContent;
    
    switch(type) {
        case 'EVENT_REMINDER':
            emailContent = generateEventReminderEmail(userName, data);
            break;
        case 'REGISTRATION_CONFIRMED':
            emailContent = generateRegistrationConfirmedEmail(userName, data);
            break;
        case 'REGISTRATION_WAITLISTED':
            emailContent = generateWaitlistEmail(userName, data);
            break;
        case 'EVENT_UPDATED':
            emailContent = generateEventUpdatedEmail(userName, data);
            break;
        case 'EVENT_CANCELLED':
            emailContent = generateEventCancelledEmail(userName, data);
            break;
        case 'WAITLIST_PROMOTED':
        case 'REGISTRATION_APPROVED':
            emailContent = generateWaitlistPromotedEmail(userName, data);
            break;
        case 'NEW_COMMENT':
            emailContent = generateNewCommentEmail(userName, data);
            break;
        default:
            emailContent = generateGenericNotificationEmail(userName, subject, data);
    }
    
    const email = {
        to: to,
        from: EMAIL_CONFIG.from,
        subject: subject,
        text: emailContent.text,
        html: emailContent.html
    };
    
    // Send via SendGrid
    return await sendEmailViaSendGrid(email);
};

// ============================================================================
// Notification Email Templates
// ============================================================================

/**
 * Generate event reminder email
 */
const generateEventReminderEmail = (userName, data) => {
    const { eventTitle, startDate, location, eventUrl } = data;
    const formattedDate = new Date(startDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const text = `
Hello ${userName},

This is a reminder that you have an upcoming event:

Event: ${eventTitle}
Date & Time: ${formattedDate}
Location: ${location?.name || 'TBD'}

${eventUrl ? `View event details: ${eventUrl}` : ''}

See you there!

Best regards,
The HuskyTrack Team
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #c8102e; margin-bottom: 20px;">Event Reminder</h2>
        
        <p>Hello ${userName},</p>
        
        <p>This is a reminder that you have an upcoming event:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #c8102e; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #c8102e;">${eventTitle}</h3>
            <p style="margin: 10px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
            <p style="margin: 10px 0;"><strong>Location:</strong> ${location?.name || 'TBD'}</p>
        </div>
        
        ${eventUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Event Details
            </a>
        </div>
        ` : ''}
        
        <p>See you there!</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return { text, html };
};

/**
 * Generate registration confirmed email
 */
const generateRegistrationConfirmedEmail = (userName, data) => {
    const { eventTitle, startDate, location, eventUrl } = data;
    const formattedDate = new Date(startDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const text = `
Hello ${userName},

Great news! Your registration has been confirmed for:

Event: ${eventTitle}
Date & Time: ${formattedDate}
Location: ${location?.name || 'TBD'}

${eventUrl ? `View event details: ${eventUrl}` : ''}

We look forward to seeing you at the event!

Best regards,
The HuskyTrack Team
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #28a745; margin-bottom: 20px;">Registration Confirmed!</h2>
        
        <p>Hello ${userName},</p>
        
        <p>Great news! Your registration has been confirmed for:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #c8102e;">${eventTitle}</h3>
            <p style="margin: 10px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
            <p style="margin: 10px 0;"><strong>Location:</strong> ${location?.name || 'TBD'}</p>
        </div>
        
        ${eventUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Event Details
            </a>
        </div>
        ` : ''}
        
        <p>We look forward to seeing you at the event!</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return { text, html };
};

/**
 * Generate event updated email
 */
const generateEventUpdatedEmail = (userName, data) => {
    const { eventTitle, changes, eventUrl } = data;
    
    const text = `
Hello ${userName},

An event you're registered for has been updated:

Event: ${eventTitle}

Changes:
${changes || 'Event details have been modified.'}

${eventUrl ? `View updated event details: ${eventUrl}` : ''}

Best regards,
The HuskyTrack Team
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #ffc107; margin-bottom: 20px;">Event Updated</h2>
        
        <p>Hello ${userName},</p>
        
        <p>An event you're registered for has been updated:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #c8102e;">${eventTitle}</h3>
            <p style="margin: 10px 0;"><strong>Changes:</strong></p>
            <p style="margin: 10px 0;">${changes || 'Event details have been modified.'}</p>
        </div>
        
        ${eventUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Updated Details
            </a>
        </div>
        ` : ''}
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return { text, html };
};

/**
 * Generate event cancelled email
 */
const generateEventCancelledEmail = (userName, data) => {
    const { eventTitle, reason } = data;
    
    const text = `
Hello ${userName},

We regret to inform you that the following event has been cancelled:

Event: ${eventTitle}

${reason ? `Reason: ${reason}` : ''}

We apologize for any inconvenience. Please check HuskyTrack for other exciting events.

Best regards,
The HuskyTrack Team
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #dc3545; margin-bottom: 20px;">Event Cancelled</h2>
        
        <p>Hello ${userName},</p>
        
        <p>We regret to inform you that the following event has been cancelled:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #dc3545; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #c8102e;">${eventTitle}</h3>
            ${reason ? `<p style="margin: 10px 0;"><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        
        <p>We apologize for any inconvenience. Please check HuskyTrack for other exciting events.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return { text, html };
};

/**
 * Generate waitlist email (when user is added to waitlist)
 */
const generateWaitlistEmail = (userName, data) => {
    const { eventTitle, startDate, location, waitlistPosition, eventUrl } = data;
    const formattedDate = new Date(startDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const text = `
Hello ${userName},

You've been added to the waitlist for:

Event: ${eventTitle}
Date & Time: ${formattedDate}
Location: ${location?.name || 'TBD'}
Waitlist Position: ${waitlistPosition}

We'll notify you if a spot opens up!

${eventUrl ? `View event details: ${eventUrl}` : ''}

Best regards,
The HuskyTrack Team
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #ffc107; margin-bottom: 20px;">Added to Waitlist</h2>
        
        <p>Hello ${userName},</p>
        
        <p>You've been added to the waitlist for:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #c8102e;">${eventTitle}</h3>
            <p style="margin: 10px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
            <p style="margin: 10px 0;"><strong>Location:</strong> ${location?.name || 'TBD'}</p>
            <p style="margin: 10px 0;"><strong>Waitlist Position:</strong> #${waitlistPosition}</p>
        </div>
        
        <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            We'll notify you via email if a spot opens up!
        </p>
        
        ${eventUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Event Details
            </a>
        </div>
        ` : ''}
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return { text, html };
};

/**
 * Generate waitlist promoted email
 */
const generateWaitlistPromotedEmail = (userName, data) => {
    const { eventTitle, startDate, location, eventUrl } = data;
    const formattedDate = new Date(startDate).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const text = `
Hello ${userName},

Exciting news! A spot has opened up and you've been promoted from the waitlist:

Event: ${eventTitle}
Date & Time: ${formattedDate}
Location: ${location?.name || 'TBD'}

${eventUrl ? `View event details: ${eventUrl}` : ''}

We look forward to seeing you at the event!

Best regards,
The HuskyTrack Team
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #28a745; margin-bottom: 20px;">You're Off the Waitlist!</h2>
        
        <p>Hello ${userName},</p>
        
        <p>Exciting news! A spot has opened up and you've been promoted from the waitlist:</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #28a745; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #c8102e;">${eventTitle}</h3>
            <p style="margin: 10px 0;"><strong>Date & Time:</strong> ${formattedDate}</p>
            <p style="margin: 10px 0;"><strong>Location:</strong> ${location?.name || 'TBD'}</p>
        </div>
        
        ${eventUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Event Details
            </a>
        </div>
        ` : ''}
        
        <p>We look forward to seeing you at the event!</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return { text, html };
};

/**
 * Generate new comment email
 */
const generateNewCommentEmail = (userName, data) => {
    const { eventTitle, commenterName, commentPreview, eventUrl } = data;
    
    const text = `
Hello ${userName},

Someone commented on your event "${eventTitle}":

${commenterName} wrote:
"${commentPreview}"

${eventUrl ? `View comment: ${eventUrl}` : ''}

Best regards,
The HuskyTrack Team
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #007bff; margin-bottom: 20px;">New Comment on Your Event</h2>
        
        <p>Hello ${userName},</p>
        
        <p>Someone commented on your event "<strong>${eventTitle}</strong>":</p>
        
        <div style="background-color: white; padding: 20px; border-left: 4px solid #007bff; margin: 20px 0;">
            <p style="margin: 0;"><strong>${commenterName}</strong> wrote:</p>
            <p style="margin: 10px 0; font-style: italic;">"${commentPreview}"</p>
        </div>
        
        ${eventUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${eventUrl}" style="background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                View Comment
            </a>
        </div>
        ` : ''}
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return { text, html };
};

/**
 * Generate generic notification email
 */
const generateGenericNotificationEmail = (userName, subject, data) => {
    const { message, actionUrl, actionText } = data;
    
    const text = `
Hello ${userName},

${message}

${actionUrl ? `${actionText || 'Click here'}: ${actionUrl}` : ''}

Best regards,
The HuskyTrack Team
    `.trim();
    
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px;">
        <h2 style="color: #c8102e; margin-bottom: 20px;">${subject}</h2>
        
        <p>Hello ${userName},</p>
        
        <p>${message}</p>
        
        ${actionUrl ? `
        <div style="text-align: center; margin: 30px 0;">
            <a href="${actionUrl}" style="background-color: #c8102e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                ${actionText || 'Click Here'}
            </a>
        </div>
        ` : ''}
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999; text-align: center;">
            This is an automated email from HuskyTrack. Please do not reply to this email.
        </p>
    </div>
</body>
</html>
    `.trim();
    
    return { text, html };
};

module.exports = {
    sendPasswordResetEmail,
    sendWelcomeEmail,
    sendPasswordChangedEmail,
    sendNotificationEmail,
    EMAIL_CONFIG
};

