import twilio from 'twilio';

/**
 * Sends an OTP message via SMS.
 * If Twilio is not configured, logs it visually in the terminal console.
 * @param {string} phone The recipient's phone number
 * @param {string} otp The generated 6-digit OTP code
 */
export const sendOTPMessage = async (phone, otp) => {
  const isTwilioConfigured =
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER;

  const formattedPhone = phone.startsWith('+') ? phone : (phone.length === 10 ? `+91${phone}` : phone);

  if (!isTwilioConfigured) {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║             📱  MOCK OTP SENT (SANDBOX LOG)                   ║
╠════════════════════════════════════════════════════════════════╣
║ Phone:   ${formattedPhone}
║ OTP:     ${otp}
║ Message: Your SKLP Fashion verification code is: ${otp}. Valid for 5 minutes. Do not share it with anyone.
╚════════════════════════════════════════════════════════════════╝
    `);
    return { success: true, mock: true };
  }

  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const message = await client.messages.create({
      body: `Your SKLP Fashion verification code is: ${otp}. Valid for 5 minutes. Do not share it with anyone.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone,
    });

    console.log(`✅ OTP SMS sent successfully via Twilio: ${message.sid}`);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('❌ Error sending OTP via Twilio:', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Falling back to sandbox logging due to Twilio error');
      return { success: true, mock: true, error: error.message };
    }
    throw error;
  }
};

export default sendOTPMessage;
