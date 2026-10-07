import { classifyCharge } from './charges';

/** Keyword → pocket id. Matched against a lower-cased merchant/description. */
const KEYWORDS: Record<string, string[]> = {
  food: [
    'kfc', 'mcdonald', 'starbucks', 'cafe', 'café', 'coffee', 'restaurant', 'foodpanda', 'food panda', 'pizza', 'burger',
    'kababjees', 'bakery', 'hardee', 'domino', 'subway', 'chai', 'tea', 'dhaba', 'biryani', 'savour', 'gloria jean',
    'tim horton', 'cheezious', 'bundu khan', 'dining', 'eat',
  ],
  transport: [
    'uber', 'careem', 'indrive', 'bykea', 'yango', 'pso', 'shell', 'total parco', 'attock', 'fuel', 'petrol', 'cng',
    'parking', 'motorway', 'm-tag', 'toll',
  ],
  essentials: [
    'carrefour', 'imtiaz', 'naheed', 'metro cash', 'chase up', 'al-fatah', 'al fatah', 'grocery', 'mart', 'pharmacy',
    'dawaai', 'k-electric', 'kelectric', 'k electric', 'lesco', 'iesco', 'mepco', 'sui gas', 'ssgc', 'sngpl', 'ptcl',
    'stormfiber', 'nayatel', 'water board', 'rent', 'utility', 'hospital', 'clinic', 'school', 'fee',
  ],
  shopping: [
    'daraz', 'khaadi', 'outfitters', 'sapphire', 'gul ahmed', 'alkaram', 'limelight', 'bonanza', 'amazon',
    'aliexpress', 'temu', 'mall', 'store', 'shop', 'ideas', 'breakout', 'ndure', 'bata',
  ],
  fun: [
    'netflix', 'spotify', 'cinepax', 'nueplex', 'cinema', 'cinestar', 'steam', 'playstation', 'xbox', 'youtube',
    'apple.com', 'google play', 'game', 'concert', 'ticket',
  ],
  travel: [
    'pia', 'airblue', 'serene air', 'airsial', 'fly jinnah', 'daewoo', 'faisal movers', 'hotel', 'airbnb',
    'booking.com', 'agoda', 'airline', 'airways', 'travel',
  ],
};

/** Normalises a merchant name so "KFC DHA KHI" and "kfc" learn the same rule. */
export function merchantKey(merchant: string): string {
  return merchant
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 2)
    .join(' ');
}

/** Labels banks use for many unrelated merchants — learning a rule from them would mislabel everything. */
const GENERIC = /^(pos|atm|card|card payment|money received|money|transfer|ibft|online|payment|purchase|unknown|salary|cash)\b/;

export function isLearnable(merchant: string): boolean {
  const key = merchantKey(merchant);
  return key.length > 1 && !GENERIC.test(key);
}

/**
 * Guess a pocket for a merchant. Rules the user taught us (by categorising) win over built-in keywords.
 * Returns undefined when unsure — the transaction then lands in "Needs review".
 */
export function guessPocket(merchant: string, pocketIds: string[], rules: Record<string, string> = {}): string | undefined {
  const learned = rules[merchantKey(merchant)];
  if (learned && pocketIds.includes(learned)) return learned;
  // Taxes, zakat and bank fees are fixed costs.
  if (classifyCharge(merchant) && pocketIds.includes('essentials')) return 'essentials';
  const text = ` ${merchant.toLowerCase()} `;
  for (const [pocket, words] of Object.entries(KEYWORDS)) {
    if (!pocketIds.includes(pocket)) continue;
    if (words.some((w) => (w.length <= 3 ? new RegExp(`\\b${w}\\b`).test(text) : text.includes(w)))) return pocket;
  }
  return undefined;
}
