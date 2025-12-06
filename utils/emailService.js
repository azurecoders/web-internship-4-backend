import nodemailer from "nodemailer";

/**
 * Create reusable transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Generate 6-digit verification code
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send verification email
 * @param {string} to - Recipient email
 * @param {string} code - Verification code
 * @param {string} name - User's name
 */
export const sendVerificationEmail = async (to, code, name) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Verify Your Email - Carpooling App",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, hsl(222, 47%, 11%) 0%, hsl(222, 47%, 18%) 100%); padding: 48px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">Carpooling App</h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.8); font-size: 14px; font-weight: 400;">Verify your email address</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 48px 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 600; line-height: 1.3;">Hello ${name}! 👋</h2>
                    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">Thank you for registering with Carpooling App. To complete your registration and start connecting with fellow commuters, please verify your email address using the code below.</p>
                    
                    <!-- Verification Code Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, hsl(222, 47%, 11%) 0%, hsl(222, 47%, 18%) 100%); border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05);">
                          <p style="margin: 0 0 12px 0; color: rgba(255, 255, 255, 0.7); font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Verification Code</p>
                          <p style="margin: 0; color: #ffffff; font-size: 42px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="background-color: #f1f5f9; border-left: 4px solid hsl(222, 47%, 11%); padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
                      <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.5;">
                        <strong style="color: #1e293b;">⏱️ Important:</strong> This verification code will expire in <strong style="color: hsl(222, 47%, 11%);">10 minutes</strong>. Please complete the verification process promptly.
                      </p>
                    </div>
                    
                    <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 14px; line-height: 1.5;">If you didn't create an account with Carpooling App, you can safely ignore this email. No further action is required.</p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; line-height: 1.5;">Need help? Contact our support team</p>
                    <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} Carpooling App. All rights reserved.</p>
                    <p style="margin: 0; color: #cbd5e1; font-size: 11px;">This is an automated message, please do not reply to this email.</p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send verification email");
  }
};

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} code - Reset code
 * @param {string} name - User's name
 */
export const sendPasswordResetEmail = async (to, code, name) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to,
    subject: "Reset Your Password - Carpooling App",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 48px 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; letter-spacing: -0.5px;">🔒 Password Reset</h1>
                    <p style="margin: 8px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 14px; font-weight: 400;">Secure your account</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 48px 40px;">
                    <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 24px; font-weight: 600; line-height: 1.3;">Hello ${name},</h2>
                    <p style="margin: 0 0 24px 0; color: #64748b; font-size: 16px; line-height: 1.6;">We received a request to reset the password for your Carpooling App account. Use the verification code below to create a new password and regain access to your account.</p>
                    
                    <!-- Reset Code Box -->
                    <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 32px 0;">
                      <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 10px 15px -3px rgba(220, 38, 38, 0.15), 0 4px 6px -2px rgba(220, 38, 38, 0.1);">
                          <p style="margin: 0 0 12px 0; color: rgba(255, 255, 255, 0.8); font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px;">Reset Code</p>
                          <p style="margin: 0; color: #ffffff; font-size: 42px; font-weight: 700; letter-spacing: 12px; font-family: 'Courier New', monospace;">${code}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
                      <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.5;">
                        <strong style="color: #991b1b;">⏱️ Time Sensitive:</strong> This password reset code will expire in <strong style="color: #dc2626;">10 minutes</strong>. Complete the reset process as soon as possible.
                      </p>
                    </div>
                    
                    <div style="background-color: #fff7ed; border-left: 4px solid #f59e0b; padding: 16px 20px; border-radius: 8px; margin: 24px 0;">
                      <p style="margin: 0; color: #78350f; font-size: 14px; line-height: 1.5;">
                        <strong style="color: #92400e;">🔐 Security Notice:</strong> If you didn't request this password reset, please secure your account immediately by changing your password and enabling two-factor authentication.
                      </p>
                    </div>
                    
                    <p style="margin: 24px 0 0 0; color: #94a3b8; font-size: 14px; line-height: 1.5;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 32px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px 0; color: #64748b; font-size: 13px; line-height: 1.5;">Need help? Contact our support team</p>
                    <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} Carpooling App. All rights reserved.</p>
                    <p style="margin: 0; color: #cbd5e1; font-size: 11px;">This is an automated message, please do not reply to this email.</p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email send error:", error);
    throw new Error("Failed to send password reset email");
  }
};
