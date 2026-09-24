/**
 * STYLE STREET — KYC Configuration & Environment Validator
 *
 * Strict Production Rules:
 * - KYC_MODE defaults to 'production'.
 * - Sandbox allowed ONLY if explicitly configured with KYC_MODE=sandbox in development.
 * - Missing provider credentials strictly prevents VERIFIED status.
 * - Provider credentials stored solely in environment variables (never client-side).
 */

export const getKycMode = () => {
  const mode = (process.env.KYC_MODE || 'production').toLowerCase().trim();
  return mode === 'sandbox' && process.env.NODE_ENV !== 'production' ? 'sandbox' : 'production';
};

export const isProductionKyc = () => getKycMode() === 'production';

export const getProviderConfig = (type) => {
  const mode = getKycMode();
  
  switch (type) {
    case 'aadhaar': {
      const provider = process.env.AADHAAR_PROVIDER || 'cashfree';
      const clientId = process.env.AADHAAR_CLIENT_ID || process.env.CASHFREE_CLIENT_ID;
      const clientSecret = process.env.AADHAAR_CLIENT_SECRET || process.env.CASHFREE_CLIENT_SECRET;
      const apiKey = process.env.AADHAAR_API_KEY;
      const isConfigured = Boolean((clientId && clientSecret) || apiKey);
      return {
        type: 'aadhaar',
        mode,
        provider,
        isConfigured,
        clientId,
        clientSecret,
        apiKey
      };
    }

    case 'pan': {
      const provider = process.env.PAN_PROVIDER || 'cashfree';
      const clientId = process.env.PAN_CLIENT_ID || process.env.CASHFREE_CLIENT_ID;
      const clientSecret = process.env.PAN_CLIENT_SECRET || process.env.CASHFREE_CLIENT_SECRET;
      const apiKey = process.env.PAN_API_KEY;
      const isConfigured = Boolean((clientId && clientSecret) || apiKey);
      return {
        type: 'pan',
        mode,
        provider,
        isConfigured,
        clientId,
        clientSecret,
        apiKey
      };
    }

    case 'bank': {
      const provider = process.env.BANK_PROVIDER || 'cashfree';
      const clientId = process.env.BANK_CLIENT_ID || process.env.CASHFREE_CLIENT_ID;
      const clientSecret = process.env.BANK_CLIENT_SECRET || process.env.CASHFREE_CLIENT_SECRET;
      const apiKey = process.env.BANK_API_KEY;
      const isConfigured = Boolean((clientId && clientSecret) || apiKey);
      return {
        type: 'bank',
        mode,
        provider,
        isConfigured,
        clientId,
        clientSecret,
        apiKey
      };
    }

    case 'phone': {
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;
      const isConfigured = Boolean(projectId);
      return {
        type: 'phone',
        mode,
        provider: 'firebase',
        isConfigured,
        hasServiceAccount: Boolean(clientEmail && privateKey)
      };
    }

    default:
      return { type, mode, isConfigured: false };
  }
};

export const getKycConfigurationStatus = () => {
  return {
    mode: getKycMode(),
    phone: getProviderConfig('phone').isConfigured,
    aadhaar: getProviderConfig('aadhaar').isConfigured,
    pan: getProviderConfig('pan').isConfigured,
    bank: getProviderConfig('bank').isConfigured
  };
};
