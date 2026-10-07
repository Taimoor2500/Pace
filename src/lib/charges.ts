/**
 * Recognises taxes, zakat and bank fees in Pakistani bank statements / SMS, e.g.
 * "WHT U/S 231A", "W.H.TAX ON PROFIT", "FED ON SMS ALERT", "ZAKAT DEDUCTION", "IBFT CHARGES".
 */
export type ChargeKind = 'wht' | 'excise' | 'other-tax' | 'zakat' | 'fee';

const RULES: { kind: ChargeKind; re: RegExp }[] = [
  { kind: 'zakat', re: /\bzakat\b/i },
  // Withholding tax: WHT, W.H.T, W/H TAX, "withholding", or an income-tax ordinance section (231A, 236P, 236Y).
  { kind: 'wht', re: /\bw\.?\s?h\.?\s?t\b|\bw\/h\b|withholding|w\.h\.?\s?tax|\bu\/s\s?\d|\b(231a|236p|236y)\b/i },
  { kind: 'excise', re: /\bf\.?e\.?d\b|federal excise|excise duty|\bexcise\b/i },
  { kind: 'other-tax', re: /\bincome tax\b|\bsales tax\b|\bg\.?s\.?t\b|\bfbr\b|\bpunjab revenue\b|\bsrb\b|\bkpra\b|\btax\b(?!i)/i },
  {
    kind: 'fee',
    re: /\b(sms|alert|service|bank|atm|ibft|annual|card|debit card|cheque ?book|statement|maintenance|ledger|withdrawal|transaction|processing|late payment|issuance|renewal)\s?(alert\s)?(charges?|fees?)\b|\bcharges? (on|for)\b|\bservice charges?\b|\bbank charges?\b|\bfee\b/i,
  },
];

/** Classifies a transaction description, or returns null if it isn't a tax/fee. */
export function classifyCharge(text: string): ChargeKind | null {
  const t = ` ${text} `;
  for (const { kind, re } of RULES) if (re.test(t)) return kind;
  return null;
}

export const CHARGE_LABEL: Record<ChargeKind, string> = {
  wht: 'Withholding tax (WHT)',
  excise: 'Federal excise (FED)',
  'other-tax': 'Other taxes',
  zakat: 'Zakat',
  fee: 'Bank fees & charges',
};

export const isTax = (k: ChargeKind | null) => k === 'wht' || k === 'excise' || k === 'other-tax';

/** Pakistan's tax year runs 1 July – 30 June and is named after the year it ends in (TY2026 = Jul 2025 – Jun 2026). */
export function taxYearOf(d: Date): number {
  return d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
}

export function taxYearRange(year: number): { start: Date; end: Date } {
  return { start: new Date(year - 1, 6, 1), end: new Date(year, 6, 1) };
}
