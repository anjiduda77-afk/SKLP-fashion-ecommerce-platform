import nodemailer from 'nodemailer';

/**
 * Sends an email using Nodemailer or logs it in console if SMTP is unconfigured.
 * @param {Object} options
 * @param {string} options.to Email address of recipient
 * @param {string} options.subject Subject line
 * @param {string} options.text Plain text content
 * @param {string} [options.html] HTML version of the content
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const isSmtpConfigured = process.env.SMTP_USER && process.env.SMTP_PASSWORD;

  if (!isSmtpConfigured) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║             ✉️  MOCK EMAIL SENT (SANDBOX LOG)                 ║
╠════════════════════════════════════════════════════════════════╣
║ To:      ${to}
║ Subject: ${subject}
║ Body:    ${text}
╚════════════════════════════════════════════════════════════════╝
    `);
    return { success: true, mock: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: `"SKLP Luxury Fashion" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    });

    console.log(`✅ Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error.message);
    // In dev environment, don't crash, just log and proceed
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Falling back to sandbox logging due to SMTP error');
      return { success: true, mock: true, error: error.message };
    }
    throw error;
  }
};

export default sendEmail;
