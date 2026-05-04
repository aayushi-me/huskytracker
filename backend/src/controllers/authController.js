/**
 * Authentication Controller
 * Handles all authentication-related operations
 */

const User = require('../models/User');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');

const {
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail
} = require('../services/notificationService');

const crypto = require('crypto');


/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, university, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }

        // Create new user
        const user = new User({ 
            firstName, 
            lastName, 
            email, 
            password, 
            university,
            role: role || 'STUDENT' // Default to STUDENT if not provided
        });

        // Generate tokens
        const { accessToken, refreshToken } = generateTokenPair(user);

        // Store refresh token in user document
        user.refreshToken = refreshToken;
        await user.save();

        // Send welcome email (optional)
        try {
            await sendWelcomeEmail({
                to: user.email,
                userName: user.firstName
            });
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Don't fail registration if email fails
        }

        // Return user data without sensitive information
        const userResponse = user.toJSON();

        res.status(201).json({ 
            success: true, 
            message: 'User registered successfully',
            data: {
                user: userResponse,
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({ 
                success: false, 
                message: 'Email already registered' 
            });
        }
        next(error);
    }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        // Find user and include password field
        const user = await User.findOne({ email }).select('+password +refreshToken');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'Account is deactivated' 
            });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Generate new tokens
        const { accessToken, refreshToken } = generateTokenPair(user);

        // Update refresh token and last login
        user.refreshToken = refreshToken;
        user.lastLogin = new Date();
        await user.save();

        // Return user data without sensitive information
        const userResponse = user.toJSON();

        res.json({ 
            success: true, 
            message: 'Login successful',
            data: {
                user: userResponse,
                accessToken,
                refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh-token
 */
const refreshToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ 
                success: false, 
                message: 'Refresh token is required' 
            });
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch (error) {
            return res.status(401).json({ 
                success: false, 
                message: error.message 
            });
        }

        // Find user and verify stored refresh token matches
        const user = await User.findById(decoded.id).select('+refreshToken');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        if (user.refreshToken !== refreshToken) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid refresh token' 
            });
        }

        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({ 
                success: false, 
                message: 'Account is deactivated' 
            });
        }

        // Generate new token pair
        const tokens = generateTokenPair(user);

        // Update stored refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        res.json({ 
            success: true, 
            message: 'Token refreshed successfully',
            data: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Logout user (invalidate refresh token)
 * POST /api/v1/auth/logout
 */
const logout = async (req, res, next) => {
    try {
        // User is attached by authenticate middleware
        const userId = req.userId;

        // Clear refresh token
        await User.findByIdAndUpdate(userId, { 
            $unset: { refreshToken: 1 } 
        });

        res.json({ 
            success: true, 
            message: 'Logout successful' 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;

        // Find user
        const user = await User.findOne({ email });

        // Always return success message (security best practice)
        // Don't reveal if email exists or not
        const successResponse = {
            success: true,
            message: 'If an account exists with that email, a password reset link has been sent'
        };

        if (!user) {
            return res.json(successResponse);
        }

        // Generate password reset token
        const resetToken = user.generatePasswordResetToken();
        await user.save();

        // Send password reset email
        try {
            await sendPasswordResetEmail({
                to: user.email,
                resetToken: resetToken,
                userName: user.firstName
            });
        } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
            // Clear reset token if email fails
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to send password reset email. Please try again later.' 
            });
        }

        res.json(successResponse);
    } catch (error) {
        next(error);
    }
};

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password/:token
 */
const resetPassword = async (req, res, next) => {
    try {
        const { token } = req.params;
        const { password } = req.body;

        // Find user by reset token
        const user = await User.findByResetToken(token);

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: 'Token expired or invalid' 
            });
        }

        // Update password
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        // Also invalidate all existing sessions
        user.refreshToken = undefined;
        
        await user.save();

        // Send confirmation email
        try {
            await sendPasswordChangedEmail({
                to: user.email,
                userName: user.firstName
            });
        } catch (emailError) {
            console.error('Failed to send password changed email:', emailError);
            // Don't fail the password reset if email fails
        }

        res.json({ 
            success: true, 
            message: 'Password reset successful. Please login with your new password.' 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user profile
 * GET /api/v1/auth/me
 */
const getCurrentUser = async (req, res, next) => {
    try {
        // User is attached by authenticate middleware
        const user = req.user;

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Not authenticated' 
            });
        }

        res.json({ 
            success: true, 
            data: {
                user: user.toJSON()
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update user profile
 * PUT /api/v1/auth/me
 */
const updateProfile = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { firstName, lastName, university } = req.body;

        // Build update object with only provided fields
        const updates = {};
        if (firstName) updates.firstName = firstName;
        if (lastName) updates.lastName = lastName;
        if (university) updates.university = university;

        // Update user
        const user = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Profile updated successfully',
            data: {
                user: user.toJSON()
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Change password
 * POST /api/v1/auth/change-password
 */
const changePassword = async (req, res, next) => {
    try {
        const userId = req.userId;
        const { currentPassword, newPassword } = req.body;

        // Get user with password field
        const user = await User.findById(userId).select('+password');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Verify current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }

        // Update password
        user.password = newPassword;
        
        // Invalidate all existing sessions
        user.refreshToken = undefined;
        
        await user.save();

        // Send confirmation email
        try {
            await sendPasswordChangedEmail({
                to: user.email,
                userName: user.firstName
            });
        } catch (emailError) {
            console.error('Failed to send password changed email:', emailError);
        }

        res.json({ 
            success: true, 
            message: 'Password changed successfully. Please login again with your new password.' 
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { 
    register, 
    login, 
    refreshToken,
    logout,
    forgotPassword,
    resetPassword,
    getCurrentUser,
    updateProfile,
    changePassword
};
