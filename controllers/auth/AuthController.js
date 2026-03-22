const { STATUS_CODES, JWT } = require('../../utils/constants');
const AuthModel = require('../../models/AuthModel');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const emailService = require('../../services/emailService');

class AuthController {
  async register(req, res) {
    try {
      const { 
        fullName, 
        email,
        role = 'user',
        password,
        confirmPassword 
      } = req.body;

      // Define required fields with display names
      const requiredFields = {
        fullName: 'Full Name',
        email: 'Email',
        role: 'Role',
        password: 'Password',
        confirmPassword: 'Confirm Password'
      };

      // Check for missing fields one at a time
      for (const [field, displayName] of Object.entries(requiredFields)) {
        if (!req.body[field]) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: `${displayName} is required`
          });
        }
      }

      // Validate fullName length
      if (fullName.trim().length <= 7) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Full name must be at least 8 characters long'
        });
      }

      // Validate fullName format
      const nameRegex = /^[A-Za-z\s\-']+$/;
      if (!nameRegex.test(fullName.trim())) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Full name can only contain letters, spaces, hyphens, and apostrophes'
        });
      }

      // Check maximum length of fullName
      if (fullName.trim().length > 100) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Full name must not exceed 100 characters'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Check if email already exists
      const existingUser = await AuthModel.findByEmail(email.trim());
      if (existingUser) {
        return res.status(STATUS_CODES.CONFLICT).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Allow only specific roles
      const allowedRoles = ['user', 'admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid role'
        });
      }

      // Validate password length      
      if (password.length < 8) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      // Validate password complexity
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        });
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      // Create IDs using uuid
      const userId = uuidv4();
      const apiKey = uuidv4();

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Capitalize fullName
      const capitalizeFullName = (name) => {
        return name
          .trim()
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      };

      const capitalizedFullName = capitalizeFullName(fullName);

      // Create user object
      const newUser = {
        userId: userId,
        apiKey: apiKey,
        fullName: capitalizedFullName,
        email: email.trim().toLowerCase(),
        role,
        hashedPassword,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Insert user into database
      const insertData = await AuthModel.create(newUser);

      // Check if insertion was successful
      if (!insertData) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Something went wrong while creating the account'
        });
      }

      // Return success response
      return res.status(STATUS_CODES.CREATED).json({
        success: true,
        message: 'Account created successfully'
      });

    } catch (error) {
      console.log('Error in register:', error);
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to create an account'
      });
    }
  }

  async login(req, res) {
    try {
      const { 
        email, 
        password 
      } = req.body;

      // Define required fields
      const requiredFields = {
        email: 'Email',
        password: 'Password'
      };

      // Check for missing fields one at a time
      for (const [field, displayName] of Object.entries(requiredFields)) {
        if (!req.body[field]) {
          return res.status(STATUS_CODES.BAD_REQUEST).json({
            success: false,
            message: `${displayName} is required`
          });
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Find user by email
      const user = await AuthModel.findByEmail(email.trim().toLowerCase());
      
      if (!user) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
      
      if (!isPasswordValid) {
        return res.status(STATUS_CODES.UNAUTHORIZED).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.userId,
          email: user.email,
          role: user.role,
          fullName: user.fullName
        },
        JWT.JWT_SECRET_KEY,
        { expiresIn: JWT.JWT_EXPIRES_IN }
      );

      // Return success response with token only
      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Login successful',
        token: token,
        role: user.role
      });

    } catch (error) {
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to login'
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Validate email is provided
      if (!email) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      // Find user by email
      const user = await AuthModel.findByEmail(email.trim().toLowerCase());
      
      // For security, don't reveal if email exists or not
      if (!user) {
        return res.status(STATUS_CODES.OK).json({
          success: true,
          message: 'If your email is registered, you will receive a password reset link'
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      // Set expiration (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);

      // Save token to database
      await AuthModel.setResetToken(user.userId, resetTokenHash, expiresAt);

      // Send email with reset link
      const emailSent = await emailService.sendPasswordResetEmail(
        user.email,
        user.fullName,
        resetToken
      );

      if (!emailSent) {
        console.error('Failed to send password reset email to:', user.email);
        // Still return success to prevent email enumeration
        return res.status(STATUS_CODES.OK).json({
          success: true,
          message: 'If your email is registered, you will receive a password reset link'
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Password reset link has been sent to your email'
      });

    } catch (error) {
      console.error('Error in forgotPassword:', error);
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to process password reset request'
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password, confirmPassword } = req.body;

      // Validate required fields
      if (!token) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Reset token is required'
        });
      }

      if (!password) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Password is required'
        });
      }

      if (!confirmPassword) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Confirm password is required'
        });
      }

      // Check if passwords match
      if (password !== confirmPassword) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Passwords do not match'
        });
      }

      // Validate password length
      if (password.length < 8) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      // Validate password complexity
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        });
      }

      // Hash the token to compare with stored hash
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // Find user by reset token
      const user = await AuthModel.findByResetToken(hashedToken);

      if (!user) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Check if token is expired
      const now = new Date();
      if (user.resetPasswordExpires < now) {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
          success: false,
          message: 'Reset token has expired. Please request a new one.'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update password and clear reset token
      const updated = await AuthModel.updatePassword(user.userId, hashedPassword);

      if (!updated) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: 'Failed to reset password'
        });
      }

      return res.status(STATUS_CODES.OK).json({
        success: true,
        message: 'Password has been reset successfully'
      });

    } catch (error) {
      console.error('Error in resetPassword:', error);
      return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to reset password'
      });
    }
  }
}

module.exports = new AuthController();