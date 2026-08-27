import axios from 'axios';
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
 * Sends OTP via Fast2SMS (Indian SMS Gateway)
 * Docs: https://docs.fast2sms.com/
 */
const sendViaFast2SMS = async (rawPhone, otp) => {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('FAST2SMS_API_KEY is not configured');
  }

  const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

  // Route 1: Fast2SMS OTP Route (Direct POST JSON — Pre-approved for instant Indian OTP delivery)
  try {
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'otp',
        variables_values: otp,
        numbers: cleanPhone
      },
      {
        headers: {
          authorization: apiKey.trim(),
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && (response.data.return === true || response.data.status_code === 200)) {
      console.log(`[OTP SERVICE] Fast2SMS OTP successfully dispatched to recipient.`);
      return { success: true, provider: 'Fast2SMS', requestId: response.data.request_id };
    }

    const errorMsg = response.data?.message?.[0] || response.data?.message || 'Fast2SMS OTP route dispatch failed';
    throw new Error(errorMsg);
  } catch (err) {
    const detail = err.response?.data?.message?.[0] || err.response?.data?.message || err.message;
    console.error(`[OTP SERVICE] Fast2SMS dispatch failed: ${detail}`);
    throw new Error(detail);
  }
};

/**
 * Sends OTP via 2Factor.in (Indian SMS Gateway)
 * Docs: https://2factor.in/v3/api-reference/sms-api
 */
const sendVia2Factor = async (rawPhone, otp) => {
  const apiKey = process.env.TWOFACTOR_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('TWOFACTOR_API_KEY is not configured');
  }

  const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

  try {
    const url = `https://2factor.in/v1/API/${apiKey.trim()}/SMS/${cleanPhone}/${otp}/SKLP_OTP`;
    const response = await axios.get(url, { timeout: 10000 });

    if (response.data?.Status === 'Success') {
      console.log(`[OTP SERVICE] 2Factor.in OTP successfully dispatched.`);
      return { success: true, provider: '2Factor.in', sessionId: response.data.Details };
    }

    // Fallback to standard route
    const fallbackUrl = `https://2factor.in/v1/API/${apiKey.trim()}/SMS/${cleanPhone}/${otp}`;
    const response2 = await axios.get(fallbackUrl, { timeout: 10000 });

    if (response2.data?.Status === 'Success') {
      console.log(`[OTP SERVICE] 2Factor.in standard OTP successfully dispatched.`);
      return { success: true, provider: '2Factor.in', sessionId: response2.data.Details };
    }

    throw new Error(response2.data?.Details || response.data?.Details || '2Factor dispatch failed');
  } catch (err) {
    const detail = err.response?.data?.Details || err.message;
    console.error(`[OTP SERVICE] 2Factor dispatch failed: ${detail}`);
    throw new Error(detail);
  }
};

/**
 * Sends OTP via Twilio (International SMS Gateway)
 */
const sendViaTwilio = async (phone, otp) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured');
  }

  const { default: twilio } = await import('twilio');
  const client = twilio(accountSid.trim(), authToken.trim());
  const formattedPhone = phone.startsWith('+')
    ? phone
    : (phone.length === 10 ? `+91${phone}` : phone);

  try {
    const message = await client.messages.create({
      body: `Your SKLP verification OTP is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`,
      from: fromNumber.trim(),
      to: formattedPhone
    });

    console.log(`[OTP SERVICE] Twilio OTP successfully dispatched.`);
    return { success: true, provider: 'Twilio', sid: message.sid };
  } catch (err) {
    console.error(`[OTP SERVICE] Twilio dispatch failed: ${err.message}`);
    throw new Error(err.message);
  }
};

/**
 * Sends a REAL OTP message using the configured external SMS provider.
 * Supports Fast2SMS, 2Factor.in, and Twilio.
 *
 * Strictly calls external API over the internet.
 * If credentials are not configured or external delivery fails, throws an error.
 *
 * @param {string} phone The recipient's 10-digit mobile number
 * @param {string} otp The generated 6-digit OTP
 */
export const sendOTPMessage = async (phone, otp) => {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const configuredProvider = (process.env.SMS_PROVIDER || 'auto').toLowerCase();

  const hasFast2SMS = Boolean(process.env.FAST2SMS_API_KEY && process.env.FAST2SMS_API_KEY.trim());
  const has2Factor = Boolean(process.env.TWOFACTOR_API_KEY && process.env.TWOFACTOR_API_KEY.trim());
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );

  // 1. Check if any provider is configured
  if (!hasFast2SMS && !has2Factor && !hasTwilio) {
    console.error('[OTP SERVICE] No active SMS provider configured in backend/.env.');
    const error = new Error('SMS_GATEWAY_NOT_CONFIGURED: Real SMS cannot be delivered until SMS provider credentials (FAST2SMS_API_KEY, TWOFACTOR_API_KEY, or TWILIO) are set in backend/.env.');
    error.code = 'SMS_GATEWAY_NOT_CONFIGURED';
    throw error;
  }

  // 2. Fast2SMS (Indian Gateway)
  if ((configuredProvider === 'fast2sms' || configuredProvider === 'auto') && hasFast2SMS) {
    return await sendViaFast2SMS(cleanPhone, otp);
  }

  // 3. 2Factor.in (Indian Gateway)
  if ((configuredProvider === '2factor' || configuredProvider === 'auto') && has2Factor) {
    return await sendVia2Factor(cleanPhone, otp);
  }

  // 4. Twilio (International Gateway)
  if ((configuredProvider === 'twilio' || configuredProvider === 'auto') && hasTwilio) {
    return await sendViaTwilio(cleanPhone, otp);
  }

  throw new Error(`Configured SMS provider "${configuredProvider}" is missing required credentials in backend/.env.`);
};

export default sendOTPMessage;
