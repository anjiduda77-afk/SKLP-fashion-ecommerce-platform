import twilio from 'twilio';
import crypto from 'crypto';

/**
 * Generates a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt for true randomness (not Math.random).
 * @returns {string} 6-digit OTP string
 */
export const generateSecureOTP = () => {
  return String(crypto.randomInt(100000, 999999));
};

/**
 * Sends an OTP message via SMS provider.
 *
 * Production: REQUIRES real SMS provider credentials.
 *             If unconfigured, throws an error — never returns fake success.
 *
 * Development (NODE_ENV=development):
 *             If SMS credentials missing, logs to server console ONLY.
 *             OTP is NEVER returned in API response or shown to customer.
 *             Only accessible in Render/server logs by authorized developers.
 *
 * @param {string} phone The recipient's 10-digit phone number
 * @param {string} otp The generated 6-digit OTP code
 */
export const sendOTPMessage = async (phone, otp) => {
  const isProduction = process.env.NODE_ENV === 'production';

  const isTwilioConfigured =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER;

  const formattedPhone = phone.startsWith('+')
    ? phone
    : (phone.length === 10 ? `+91${phone}` : phone);

  const smsBody = `Your SKLP Fashion OTP is ${otp}. It is valid for 5 minutes. Do not share this OTP with anyone.`;

  // ── PRODUCTION: Real SMS required ────────────────────────────────────────────
  if (isProduction) {
    if (!isTwilioConfigured) {
      // Never fake success in production — throw a clear config error
      console.error('[OTP SERVICE] CRITICAL: SMS provider not configured in production. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER in environment variables.');
      throw new Error('Mobile OTP service is not configured. Please contact support.');
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({
      body: smsBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    // Log only the SID (never the OTP) for audit trail
    console.log(`[OTP SERVICE] SMS sent via Twilio. SID: ${message.sid} | To: ${formattedPhone.slice(0, 5)}XXXXX`);
    return { success: true, sid: message.sid };
  }

  // ── DEVELOPMENT: Twilio if configured, else server-only console log ──────────
  if (isTwilioConfigured) {
    try {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const message = await client.messages.create({
        body: smsBody,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone,
      });
      console.log(`[OTP SERVICE] SMS sent via Twilio (dev). SID: ${message.sid}`);
      return { success: true, sid: message.sid };
    } catch (error) {
      console.error('[OTP SERVICE] Twilio send failed in dev:', error.message);
      // Fall through to dev sandbox log below
    }
  }

  // Development sandbox fallback — OTP visible only in server terminal logs
  // This is NEVER exposed to frontend or API response
  console.log(`\n[OTP SERVICE] ========== DEVELOPMENT SANDBOX ==========`);
  console.log(`[OTP SERVICE] Phone: ${formattedPhone.slice(0, 7)}XXX (masked)`);
  console.log(`[OTP SERVICE] OTP for development testing: ${otp}`);
  console.log(`[OTP SERVICE] Message: "${smsBody}"`);
  console.log(`[OTP SERVICE] ============================================\n`);

  return { success: true, sandbox: true };
};

export default sendOTPMessage;
