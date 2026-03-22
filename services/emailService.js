// services/emailService.js
const axios = require('axios');

class EmailService {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.sender = {
      email: process.env.BREVO_SENDER_EMAIL || 'noreply@uplb-safespace.edu.ph',
      name: process.env.BREVO_SENDER_NAME || 'UPLB SafeSpace'
    };
    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5500';
  }

  /**
   * Send password reset email using Brevo API
   * @param {string} email - Recipient email address
   * @param {string} fullName - Recipient full name
   * @param {string} resetToken - Password reset token
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(email, fullName, resetToken) {
    try {
      const resetUrl = `${this.frontendUrl}/reset-password.html?token=${resetToken}`;
      
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Password Reset Request</title>
        </head>
        <body>
          <p>Hello ${fullName},</p>
          
          <p>We received a request to reset the password for your UPLB SafeSpace account.</p>
          
          <p>Click the link below to reset your password (valid for 1 hour):</p>
          
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          
          <p>If you did not request this password reset, please ignore this email.</p>
          
          <hr>
          
          <p>UPLB SafeSpace - Office of Anti-Sexual Harassment</p>
          <p>University of the Philippines Los Baños</p>
        </body>
        </html>
      `;

      const emailData = {
        sender: this.sender,
        to: [{ email: email, name: fullName }],
        subject: 'Reset Your UPLB SafeSpace Password',
        htmlContent: emailHtml
      };

      // Make API call to Brevo using axios
      const response = await axios.post('https://api.brevo.com/v3/smtp/email', emailData, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        }
      });

      console.log('Email sent successfully:', response.data.messageId);
      return true;

    } catch (error) {
      console.error('Error sending password reset email:');
      if (error.response) {
        console.error('Brevo API error:', error.response.data);
      } else {
        console.error(error.message);
      }
      return false;
    }
  }
}

module.exports = new EmailService();