/**
 * STYLE STREET Phone Privacy Masking Utility
 * For: +91 9876543210 -> +91 98*****210
 * Rules:
 * - Country code visible when present
 * - First 2 local digits visible
 * - Middle digits masked with '*'
 * - Last 3 local digits visible
 */
export const maskPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim();
  if (!trimmed) return '';

  let countryCode = '';
  let localNumber = trimmed;

  if (trimmed.startsWith('+')) {
    const spaceIdx = trimmed.indexOf(' ');
    if (spaceIdx > 0 && spaceIdx <= 5) {
      countryCode = trimmed.slice(0, spaceIdx).trim();
      localNumber = trimmed.slice(spaceIdx + 1).replace(/\D/g, '');
    } else if (trimmed.startsWith('+91')) {
      countryCode = '+91';
      localNumber = trimmed.slice(3).replace(/\D/g, '');
    } else {
      const match = trimmed.match(/^(\+\d{1,4})(.*)$/);
      if (match) {
        countryCode = match[1];
        localNumber = match[2].replace(/\D/g, '');
      }
    }
  } else {
    localNumber = trimmed.replace(/\D/g, '');
  }

  if (localNumber.length >= 5) {
    const first2 = localNumber.slice(0, 2);
    const last3 = localNumber.slice(-3);
    const maskedCount = Math.max(localNumber.length - 5, 5);
    const middle = '*'.repeat(maskedCount);
    return countryCode ? `${countryCode} ${first2}${middle}${last3}` : `${first2}${middle}${last3}`;
  }

  return localNumber ? (countryCode ? `${countryCode} ***` : '***') : '';
};

export default maskPhoneNumber;
