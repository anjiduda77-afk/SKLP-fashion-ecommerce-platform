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
  if (!apiKey) throw new Error('FAST2SMS_API_KEY is not configured');

  const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

  // Attempt 1: Fast2SMS OTP Route (Direct POST JSON)
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
          authorization: apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && (response.data.return === true || response.data.status_code === 200)) {
      console.log(`[OTP SERVICE] Fast2SMS OTP dispatched to +91 ${cleanPhone.slice(0, 5)}XXXXX (ReqID: ${response.data.request_id || 'OK'})`);
      return { success: true, provider: 'Fast2SMS (OTP Route)', requestId: response.data.request_id };
    }
  } catch (err) {
    console.warn(`[OTP SERVICE] Fast2SMS OTP route attempt 1 failed: ${err.response?.data?.message || err.message}. Attempting Quick Route fallback...`);
  }

  // Attempt 2: Fast2SMS Quick Route (q)
  try {
    const fallbackResponse = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'q',
        message: `Your SKLP verification OTP is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`,
        language: 'english',
        flash: 0,
        numbers: cleanPhone
      },
      {
        headers: {
          authorization: apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    if (fallbackResponse.data && (fallbackResponse.data.return === true || fallbackResponse.data.status_code === 200)) {
      console.log(`[OTP SERVICE] Fast2SMS Quick Route dispatched to +91 ${cleanPhone.slice(0, 5)}XXXXX (ReqID: ${fallbackResponse.data.request_id || 'OK'})`);
      return { success: true, provider: 'Fast2SMS (Quick Route)', requestId: fallbackResponse.data.request_id };
    }
  } catch (err2) {
    console.warn(`[OTP SERVICE] Fast2SMS Quick Route attempt 2 failed: ${err2.response?.data?.message || err2.message}. Attempting GET URL fallback...`);
  }

  // Attempt 3: Fast2SMS GET API Route
  try {
    const getUrl = `https://www.fast2sms.com/dev/bulkV2?authorization=${encodeURIComponent(apiKey)}&route=otp&variables_values=${otp}&numbers=${cleanPhone}&flash=0`;
    const getRes = await axios.get(getUrl, { timeout: 10000 });
    if (getRes.data && (getRes.data.return === true || getRes.data.status_code === 200)) {
      console.log(`[OTP SERVICE] Fast2SMS GET route dispatched to +91 ${cleanPhone.slice(0, 5)}XXXXX`);
      return { success: true, provider: 'Fast2SMS (GET Route)', requestId: getRes.data.request_id };
    }
    throw new Error(getRes.data?.message?.[0] || getRes.data?.message || 'Fast2SMS GET route failed');
  } catch (err3) {
    throw new Error(err3.response?.data?.message?.[0] || err3.response?.data?.message || err3.message || 'Fast2SMS service error');
  }
};

/**
 * Sends OTP via 2Factor.in (Indian SMS Gateway)
 * Docs: https://2factor.in/v3/api-reference/sms-api
 */
const sendVia2Factor = async (rawPhone, otp) => {
  const apiKey = process.env.TWOFACTOR_API_KEY;
  if (!apiKey) throw new Error('TWOFACTOR_API_KEY is not configured');

  const cleanPhone = rawPhone.replace(/\D/g, '').slice(-10);

  // Attempt 1: Custom Template Route
  try {
    const url = `https://2factor.in/v1/API/${apiKey}/SMS/${cleanPhone}/${otp}/SKLP_OTP`;
    const response = await axios.get(url, { timeout: 10000 });
    if (response.data?.Status === 'Success') {
      console.log(`[OTP SERVICE] 2Factor dispatched successfully to +91 ${cleanPhone.slice(0, 5)}XXXXX (Session: ${response.data.Details})`);
      return { success: true, provider: '2Factor.in', sessionId: response.data.Details };
    }
  } catch (err) {
    console.warn(`[OTP SERVICE] 2Factor custom template failed: ${err.message}. Trying standard OTP route...`);
  }

  // Attempt 2: Standard OTP Route
  try {
    const fallbackUrl = `https://2factor.in/v1/API/${apiKey}/SMS/${cleanPhone}/${otp}`;
    const response2 = await axios.get(fallbackUrl, { timeout: 10000 });
    if (response2.data?.Status === 'Success') {
      console.log(`[OTP SERVICE] 2Factor standard route dispatched to +91 ${cleanPhone.slice(0, 5)}XXXXX`);
      return { success: true, provider: '2Factor.in', sessionId: response2.data.Details };
    }
    throw new Error(response2.data?.Details || '2Factor dispatch failed');
  } catch (err2) {
    throw new Error(err2.response?.data?.Details || err2.message || '2Factor service error');
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
  const client = twilio(accountSid, authToken);
  const formattedPhone = phone.startsWith('+')
    ? phone
    : (phone.length === 10 ? `+91${phone}` : phone);

  const message = await client.messages.create({
    body: `Your SKLP verification OTP is ${otp}. Valid for 5 minutes. Do not share this OTP with anyone.`,
    from: fromNumber,
    to: formattedPhone
  });

  console.log(`[OTP SERVICE] Twilio dispatched successfully. SID: ${message.sid}`);
  return { success: true, provider: 'Twilio', sid: message.sid };
};

/**
 * Sends an OTP message using the configured or auto-detected SMS provider.
 * Supports Fast2SMS, 2Factor.in, Twilio, and development console sandbox.
 *
 * @param {string} phone The recipient's 10-digit mobile number
 * @param {string} otp The generated 6-digit OTP
 */
export const sendOTPMessage = async (phone, otp) => {
  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredProvider = (process.env.SMS_PROVIDER || 'auto').toLowerCase();

  // 1. Fast2SMS (Indian SMS Gateway)
  if (
    (configuredProvider === 'fast2sms' || configuredProvider === 'auto') &&
    process.env.FAST2SMS_API_KEY &&
    process.env.FAST2SMS_API_KEY.trim() !== ''
  ) {
    try {
      return await sendViaFast2SMS(cleanPhone, otp);
    } catch (err) {
      console.error('[OTP SERVICE] Fast2SMS dispatch error:', err.message);
      if (isProduction && !process.env.TWOFACTOR_API_KEY && !process.env.TWILIO_ACCOUNT_SID) {
        throw new Error(`SMS delivery failed: ${err.message}`);
      }
    }
  }

  // 2. 2Factor.in (Indian SMS Gateway)
  if (
    (configuredProvider === '2factor' || configuredProvider === 'auto') &&
    process.env.TWOFACTOR_API_KEY &&
    process.env.TWOFACTOR_API_KEY.trim() !== ''
  ) {
    try {
      return await sendVia2Factor(cleanPhone, otp);
    } catch (err) {
      console.error('[OTP SERVICE] 2Factor dispatch error:', err.message);
      if (isProduction && !process.env.TWILIO_ACCOUNT_SID) {
        throw new Error(`SMS delivery failed: ${err.message}`);
      }
    }
  }

  // 3. Twilio (International SMS Gateway)
  if (
    (configuredProvider === 'twilio' || configuredProvider === 'auto') &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_ACCOUNT_SID.trim() !== ''
  ) {
    try {
      return await sendViaTwilio(cleanPhone, otp);
    } catch (err) {
      console.error('[OTP SERVICE] Twilio dispatch error:', err.message);
      if (isProduction) {
        throw new Error(`SMS delivery failed: ${err.message}`);
      }
    }
  }

  // 4. Production Check: Strict rejection in production if no provider configured
  if (isProduction) {
    console.error('[OTP SERVICE] CRITICAL: No active SMS gateway configured on server. Please set FAST2SMS_API_KEY, TWOFACTOR_API_KEY, or TWILIO credentials in environment variables.');
    throw new Error('Mobile SMS service is not configured. Please set FAST2SMS_API_KEY in server environment variables.');
  }

  // 5. Development Sandbox Simulation Mode
  console.log(`\n[OTP SERVICE] ========== DEVELOPMENT SANDBOX ==========`);
  console.log(`[OTP SERVICE] Recipient: +91 ${cleanPhone.slice(0, 5)}XXXXX`);
  console.log(`[OTP SERVICE] Generated OTP for Testing: ${otp}`);
  console.log(`[OTP SERVICE] Notice: Set FAST2SMS_API_KEY in backend/.env to send real SMS to this phone.`);
  console.log(`[OTP SERVICE] ============================================\n`);

  return { success: true, sandbox: true, provider: null };
};

export default sendOTPMessage;
