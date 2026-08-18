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
      console.log(`[OTP SERVICE] Fast2SMS dispatched successfully to +91 ${cleanPhone.slice(0, 5)}XXXXX (ReqID: ${response.data.request_id || 'OK'})`);
      return { success: true, provider: 'fast2sms', requestId: response.data.request_id };
    } else {
      throw new Error(response.data?.message?.[0] || response.data?.message || 'Fast2SMS dispatch failed');
    }
  } catch (err) {
    // If OTP route is restricted, try Quick route fallback
    if (err.response?.data?.message) {
      console.warn(`[OTP SERVICE] Fast2SMS OTP route returned: ${JSON.stringify(err.response.data)}. Attempting quick route...`);
    }
    const fallbackResponse = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'q',
        message: `Your SKLP Fashion verification OTP is ${otp}. Valid for 5 minutes. Do not share this with anyone.`,
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
    if (fallbackResponse.data && fallbackResponse.data.return === true) {
      return { success: true, provider: 'fast2sms_q', requestId: fallbackResponse.data.request_id };
    }
    throw new Error(err.response?.data?.message || err.message || 'Fast2SMS service error');
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
  const url = `https://2factor.in/v1/API/${apiKey}/SMS/${cleanPhone}/${otp}/SKLP_OTP`;

  const response = await axios.get(url, { timeout: 10000 });
  if (response.data?.Status === 'Success') {
    console.log(`[OTP SERVICE] 2Factor dispatched successfully to +91 ${cleanPhone.slice(0, 5)}XXXXX (Session: ${response.data.Details})`);
    return { success: true, provider: '2factor', sessionId: response.data.Details };
  } else {
    throw new Error(response.data?.Details || '2Factor dispatch failed');
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
    body: `Your SKLP Fashion OTP is ${otp}. It is valid for 5 minutes. Do not share this OTP with anyone.`,
    from: fromNumber,
    to: formattedPhone
  });

  console.log(`[OTP SERVICE] Twilio dispatched successfully. SID: ${message.sid}`);
  return { success: true, provider: 'twilio', sid: message.sid };
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

  // 1. Explicit or Auto Provider Routing
  if (configuredProvider === 'fast2sms' || (configuredProvider === 'auto' && process.env.FAST2SMS_API_KEY)) {
    try {
      return await sendViaFast2SMS(cleanPhone, otp);
    } catch (err) {
      console.error('[OTP SERVICE] Fast2SMS dispatch failed:', err.message);
      if (isProduction && !process.env.TWOFACTOR_API_KEY && !process.env.TWILIO_ACCOUNT_SID) {
        throw new Error(`SMS delivery failed: ${err.message}`);
      }
    }
  }

  if (configuredProvider === '2factor' || (configuredProvider === 'auto' && process.env.TWOFACTOR_API_KEY)) {
    try {
      return await sendVia2Factor(cleanPhone, otp);
    } catch (err) {
      console.error('[OTP SERVICE] 2Factor dispatch failed:', err.message);
      if (isProduction && !process.env.TWILIO_ACCOUNT_SID) {
        throw new Error(`SMS delivery failed: ${err.message}`);
      }
    }
  }

  if (configuredProvider === 'twilio' || (configuredProvider === 'auto' && process.env.TWILIO_ACCOUNT_SID)) {
    try {
      return await sendViaTwilio(cleanPhone, otp);
    } catch (err) {
      console.error('[OTP SERVICE] Twilio dispatch failed:', err.message);
      if (isProduction) {
        throw new Error(`SMS delivery failed: ${err.message}`);
      }
    }
  }

  // 2. Production Check (Keys required in production)
  if (isProduction) {
    console.error('[OTP SERVICE] CRITICAL: No active SMS gateway configured on Render. Please set FAST2SMS_API_KEY, TWOFACTOR_API_KEY, or TWILIO credentials.');
    throw new Error('Mobile SMS service is not configured. Please set FAST2SMS_API_KEY in Render environment variables or contact support.');
  }

  // 3. Development Sandbox Fallback (Prints securely only in developer server console)
  console.log(`\n[OTP SERVICE] ========== DEVELOPMENT SANDBOX ==========`);
  console.log(`[OTP SERVICE] Recipient: +91 ${cleanPhone.slice(0, 5)}XXXXX (masked)`);
  console.log(`[OTP SERVICE] Generated OTP for Testing: ${otp}`);
  console.log(`[OTP SERVICE] Status: Simulated Delivery (No SMS charges)`);
  console.log(`[OTP SERVICE] ============================================\n`);

  return { success: true, sandbox: true };
};

export default sendOTPMessage;
