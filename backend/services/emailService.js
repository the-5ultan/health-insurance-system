const nodemailer = require('nodemailer');

// Configure Nodemailer Transport Engine
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Sends a branded email asynchronously
 */
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"Care Zone" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}: ${subject}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
  }
};

/**
 * Template for Login/Welcome Confirmation
 */
const getWelcomeTemplate = (user) => {
  const name = user.firstName || user.username || 'Valued Member';
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; background-color: #ffffff; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000000; font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">CARE ZONE</h1>
        <p style="color: #666; font-size: 14px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Security Protocol Active</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 16px; margin-bottom: 30px;">
        <h2 style="margin-top: 0; color: #1a1a1a;">Welcome back, ${name}</h2>
        <p style="line-height: 1.6; color: #444;">This email confirms a successful login to your <strong>Care Zone</strong> account. Your node has been successfully authenticated and a secure session has been established.</p>
      </div>

      <div style="border-left: 4px solid #3b82f6; padding-left: 20px; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 13px; color: #666;"><strong>Timestamp:</strong> ${new Date().toUTCString()}</p>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;"><strong>Status:</strong> Authorized / Secure</p>
      </div>

      <p style="font-size: 14px; color: #888; line-height: 1.5;">If this access was not authorized by you, please terminate all sessions immediately through your security dashboard or contact our technical response team.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
        <p style="font-size: 12px; color: #bbb; margin: 0;">© 2026 Care Zone // Decentralized Insurance Engine</p>
      </div>
    </div>
  `;
};

/**
 * Template for Google Authentication Success
 */
const getGoogleAuthTemplate = (user) => {
  const name = user.firstName || user.username || 'Valued Member';
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; background-color: #ffffff; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000000; font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">CARE ZONE</h1>
        <p style="color: #4285F4; font-size: 12px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Cloud Identity Connected</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 16px; margin-bottom: 30px;">
        <h2 style="margin-top: 0; color: #1a1a1a;">Identity Verified</h2>
        <p style="line-height: 1.6; color: #444;">Hello ${name}, your Google account has been successfully connected to <strong>Care Zone</strong>. You can now use your cloud identity for seamless access to the automated insurance network.</p>
      </div>

      <div style="border-left: 4px solid #4285F4; padding-left: 20px; margin-bottom: 30px;">
        <p style="margin: 0; font-size: 13px; color: #666;"><strong>Provider:</strong> Google Cloud Identity</p>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #666;"><strong>Connection:</strong> Established / Verified</p>
      </div>

      <p style="font-size: 14px; color: #888; line-height: 1.5;">Security Note: Using a single-sign-on provider enhances your account security with multi-factor authentication managed by Google.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
        <p style="font-size: 12px; color: #bbb; margin: 0;">© 2026 Care Zone // Secure Node Infrastructure</p>
      </div>
    </div>
  `;
};

/**
 * Template for OTP Verification
 */
const getOTPTemplate = (otpCode) => {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; background-color: #ffffff; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000000; font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">CARE ZONE</h1>
        <p style="color: #ff9900; font-size: 12px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Verification Token</p>
      </div>
      
      <p style="font-size: 16px; color: #444; text-align: center;">Use the secure authorization code below to verify your identity:</p>
      
      <div style="background-color: #f1f2f3; padding: 30px; border-radius: 20px; text-align: center; margin: 30px 0;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #131921;">${otpCode}</span>
      </div>

      <p style="font-size: 13px; color: #888; text-align: center; line-height: 1.5;">This token remains valid for <strong>5 minutes</strong>.<br>If you did not request this code, your account security may be compromised.</p>
      
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
        <p style="font-size: 12px; color: #bbb; margin: 0;">© 2026 Care Zone // Protocol v4.0</p>
      </div>
    </div>
  `;
};

const getRoleChangedTemplate = ({ user, previousRole, nextRole, reason }) => {
  const name = user.firstName || user.username || 'Valued Member';
  const prev = (previousRole || '').toString().toUpperCase();
  const next = (nextRole || '').toString().toUpperCase();
  const why = reason ? String(reason) : 'Your access level has been updated by a System Administrator.';
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; background-color: #ffffff; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000000; font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">CARE ZONE</h1>
        <p style="color: #3b82f6; font-size: 12px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Role Authority Updated</p>
      </div>
      <div style="background-color: #f8f9fa; padding: 28px; border-radius: 16px; margin-bottom: 18px;">
        <h2 style="margin-top: 0; color: #1a1a1a;">Hello ${name},</h2>
        <p style="line-height: 1.6; color: #444; margin-bottom: 0;">${why}</p>
      </div>
      <div style="border: 1px solid #eef0f3; border-radius: 16px; padding: 18px 20px; margin-bottom: 22px;">
        <p style="margin: 0; font-size: 13px; color: #666;"><strong>Previous role:</strong> ${prev || 'N/A'}</p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;"><strong>New role:</strong> ${next || 'N/A'}</p>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;"><strong>Effective:</strong> ${new Date().toUTCString()}</p>
      </div>
      <p style="font-size: 13px; color: #666; line-height: 1.6;">
        Your dashboard modules and permissions will reflect this change automatically the next time you load the Care Zone portal.
      </p>
      <div style="margin-top: 34px; padding-top: 18px; border-top: 1px solid #eee; text-align: center;">
        <p style="font-size: 12px; color: #bbb; margin: 0;">© 2026 Care Zone // Authority & Compliance</p>
      </div>
    </div>
  `;
};

const getRoleRequestDecisionTemplate = ({ user, requestedRole, decision, adminNotes }) => {
  const name = user.firstName || user.username || 'Valued Member';
  const role = (requestedRole || '').toString().toUpperCase();
  const dec = (decision || '').toString().toUpperCase();
  const note = adminNotes ? String(adminNotes) : '';
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; margin: auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px; background-color: #ffffff; color: #1a1a1a;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000000; font-size: 28px; font-weight: 900; letter-spacing: -1px; margin: 0;">CARE ZONE</h1>
        <p style="color: ${decision === 'Approved' ? '#10b981' : '#ef4444'}; font-size: 12px; margin-top: 5px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">Role Request ${dec}</p>
      </div>
      <div style="background-color: #f8f9fa; padding: 28px; border-radius: 16px; margin-bottom: 18px;">
        <h2 style="margin-top: 0; color: #1a1a1a;">Hello ${name},</h2>
        <p style="line-height: 1.6; color: #444; margin-bottom: 0;">
          Your request for <strong>${role}</strong> access has been <strong>${dec}</strong>.
        </p>
      </div>
      ${note ? `
        <div style="border-left: 4px solid #3b82f6; padding-left: 18px; margin-bottom: 22px;">
          <p style="margin: 0; font-size: 13px; color: #666;"><strong>Admin note:</strong> ${note}</p>
        </div>
      ` : ''}
      <p style="font-size: 13px; color: #666; line-height: 1.6;">
        If you believe this decision was made in error, please contact your Care Zone administrator.
      </p>
      <div style="margin-top: 34px; padding-top: 18px; border-top: 1px solid #eee; text-align: center;">
        <p style="font-size: 12px; color: #bbb; margin: 0;">© 2026 Care Zone // Authority & Compliance</p>
      </div>
    </div>
  `;
};

module.exports = {
  sendEmail,
  getWelcomeTemplate,
  getGoogleAuthTemplate,
  getOTPTemplate,
  getRoleChangedTemplate,
  getRoleRequestDecisionTemplate
};
