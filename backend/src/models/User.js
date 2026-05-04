/**
 * User Model
 * Defines the User schema and methods for authentication and authorization
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { NotificationPreferencesSchema } = require('./NotificationPreferences');

// User roles enum
const USER_ROLES = {
    STUDENT: 'STUDENT',
    ORGANIZER: 'ORGANIZER',
    ADMIN: 'ADMIN'
};

// User schema
const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true,
        maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
        type: String,
        required: [true, 'Last name is required'],
        trim: true,
        maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false // Don't include password in queries by default
    },
    university: {
        type: String,
        required: [true, 'University is required'],
        trim: true
    },
    role: {
        type: String,
        enum: Object.values(USER_ROLES),
        default: USER_ROLES.STUDENT,
        required: true
    },
    // Refresh token for JWT authentication
    refreshToken: {
        type: String,
        select: false
    },
    // Password reset functionality
    resetPasswordToken: {
        type: String,
        select: false
    },
    resetPasswordExpires: {
        type: Date,
        select: false
    },
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    // Email verification (optional for now)
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        select: false
    },
    // Last login tracking
    lastLogin: {
        type: Date
    },
    // Notification preferences
    notificationPreferences: {
        type: NotificationPreferencesSchema,
        default: () => ({})
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.password;
            delete ret.refreshToken;
            delete ret.resetPasswordToken;
            delete ret.resetPasswordExpires;
            delete ret.emailVerificationToken;
            delete ret.__v;
            return ret;
        }
    }
});

// Index for email lookup performance
userSchema.index({ email: 1 });

// Hash password before saving (only if modified)
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Instance method: Compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Instance method: Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    // Generate random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token and set to resetPasswordToken field
    this.resetPasswordToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    // Set expiration to 1 hour from now
    this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    
    // Return unhashed token (to be sent via email)
    return resetToken;
};

// Instance method: Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    this.emailVerificationToken = crypto
        .createHash('sha256')
        .update(verificationToken)
        .digest('hex');
    
    return verificationToken;
};

// Static method: Find user by reset token
userSchema.statics.findByResetToken = async function(resetToken) {
    // Hash the provided token to compare with stored hash
    const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
    
    // Find user with valid token and not expired
    return await this.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires');
};

// Static method: Check if email exists
userSchema.statics.emailExists = async function(email) {
    const user = await this.findOne({ email: email.toLowerCase() });
    return !!user;
};

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.model('User', userSchema);

module.exports = User;
module.exports.USER_ROLES = USER_ROLES;
