/**
 * JWT Utilities
 * Handles access token and refresh token generation and verification
 */

const jwt = require('jsonwebtoken');

/**
 * Generate access token (short-lived)
 * @param {Object} payload - Token payload (userId, role, etc.)
 */
const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
};

/**
 * Generate refresh token (long-lived)
 * @param {Object} payload - Token payload (userId)
 */
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
};

/**
 * Verify access token
 * @param {String} token - JWT access token
 */
const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Token expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid token');
        }
        throw error;
    }
};

/**
 * Verify refresh token
 * @param {String} token - JWT refresh token
 */
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            throw new Error('Refresh token expired');
        }
        if (error.name === 'JsonWebTokenError') {
            throw new Error('Invalid refresh token');
        }
        throw error;
    }
};

/**
 * Generate both access and refresh tokens
 * @param {Object} user - User object with id and role
 */
const generateTokenPair = (user) => {
    const payload = {
        id: user._id || user.id,
        role: user.role,
        email: user.email
    };
    
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({ id: payload.id });
    
    return { accessToken, refreshToken };
};

/**
 * Decode token without verification (for debugging)
 * @param {String} token - JWT token
 */
const decodeToken = (token) => {
    return jwt.decode(token);
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    generateTokenPair,
    decodeToken,
    // Legacy aliases for backward compatibility
    generateToken: generateAccessToken,
    verifyToken: verifyAccessToken
};
