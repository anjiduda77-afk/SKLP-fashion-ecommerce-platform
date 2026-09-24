/**
 * STYLE STREET — KYC Name Matching & Identity Consistency Service
 *
 * Compares:
 * - Applicant Legal Name
 * - Name on Aadhaar (from verified provider)
 * - Name on PAN (from verified provider)
 * - Bank Account Holder Name (from verified provider)
 *
 * Rules:
 * - Normalized tokens: removes titles (Mr, Mrs, Ms, Dr, M/s), extra spaces, punctuation.
 * - Similarity >= 85%: MATCHED
 * - Similarity 65% - 84%: PARTIAL_MATCH
 * - Similarity < 65%: MISMATCH -> Triggers 'NEEDS_REVIEW' for admin approval.
 */

const HONORIFICS = new Set(['MR', 'MRS', 'MS', 'MISS', 'DR', 'SHREE', 'SHRI', 'SMT', 'M/S', 'MD', 'MOHD']);

/**
 * Normalizes a legal name for comparison
 */
export const cleanName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toUpperCase()
    .replace(/[^\w\s]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token && !HONORIFICS.has(token))
    .join(' ')
    .trim();
};

/**
 * Calculate Jaccard / Token-Sort Similarity (0 - 100)
 */
export const computeTokenSimilarity = (nameA, nameB) => {
  const normA = cleanName(nameA);
  const normB = cleanName(nameB);

  if (!normA || !normB) return 0;
  if (normA === normB) return 100;

  const tokensA = new Set(normA.split(' '));
  const tokensB = new Set(normB.split(' '));

  const intersection = new Set([...tokensA].filter((x) => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);

  if (union.size === 0) return 0;

  // Exact token match ratio
  const jaccard = (intersection.size / union.size) * 100;

  // Substring / initial matching bonus (e.g., "A DUDA" vs "ANJI DUDA")
  let tokenMatchScore = jaccard;
  const listA = [...tokensA];
  const listB = [...tokensB];

  let singleInitialMatches = 0;
  listA.forEach((tA) => {
    if (tA.length === 1) {
      if (listB.some((tB) => tB.startsWith(tA))) singleInitialMatches++;
    }
  });
  listB.forEach((tB) => {
    if (tB.length === 1) {
      if (listA.some((tA) => tA.startsWith(tB))) singleInitialMatches++;
    }
  });

  if (singleInitialMatches > 0) {
    tokenMatchScore = Math.min(100, tokenMatchScore + singleInitialMatches * 15);
  }

  return Math.round(tokenMatchScore);
};

/**
 * Evaluates the full identity consistency across verified sources
 * @param {Object} names
 * @param {string} names.applicantName
 * @param {string} [names.aadhaarName]
 * @param {string} [names.panName]
 * @param {string} [names.bankAccountName]
 * @returns {Object} evaluation
 */
export const evaluateIdentityConsistency = ({
  applicantName,
  aadhaarName,
  panName,
  bankAccountName
}) => {
  const scores = {};
  const comparisons = [];

  if (applicantName && panName) {
    const s = computeTokenSimilarity(applicantName, panName);
    scores.applicantVsPan = s;
    comparisons.push({ pair: 'Applicant vs PAN', score: s });
  }

  if (applicantName && aadhaarName) {
    const s = computeTokenSimilarity(applicantName, aadhaarName);
    scores.applicantVsAadhaar = s;
    comparisons.push({ pair: 'Applicant vs Aadhaar', score: s });
  }

  if (panName && bankAccountName) {
    const s = computeTokenSimilarity(panName, bankAccountName);
    scores.panVsBank = s;
    comparisons.push({ pair: 'PAN vs Bank', score: s });
  }

  if (applicantName && bankAccountName) {
    const s = computeTokenSimilarity(applicantName, bankAccountName);
    scores.applicantVsBank = s;
    comparisons.push({ pair: 'Applicant vs Bank', score: s });
  }

  if (comparisons.length === 0) {
    return {
      status: 'UNAVAILABLE',
      averageScore: 0,
      scores,
      requiresManualReview: false,
      notes: 'No verified provider names available yet for cross-check.'
    };
  }

  const avg = Math.round(
    comparisons.reduce((acc, cur) => acc + cur.score, 0) / comparisons.length
  );

  let status = 'MATCHED';
  let requiresManualReview = false;
  let notes = 'All verified identity names match the applicant record.';

  if (avg < 65 || comparisons.some((c) => c.score < 50)) {
    status = 'MISMATCH';
    requiresManualReview = true;
    notes = 'Significant discrepancy detected across identity names. Mandatory compliance review required.';
  } else if (avg < 85 || comparisons.some((c) => c.score < 70)) {
    status = 'PARTIAL_MATCH';
    requiresManualReview = true;
    notes = 'Partial name match detected (possible initials or married/alias name). Review advised.';
  }

  return {
    status,
    averageScore: avg,
    scores,
    requiresManualReview,
    notes
  };
};

export default {
  cleanName,
  computeTokenSimilarity,
  evaluateIdentityConsistency
};
