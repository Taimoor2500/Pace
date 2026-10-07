import { classifyCharge, type ChargeKind } from './charges';

/**
 * Parses Pakistani bank / wallet SMS alerts (HBL, Meezan, UBL, MCB, Alfalah, JazzCash, Easypaisa, …)
 * into transactions. Deliberately tolerant: banks reword their templates often.
 */

const CHARGE_SMS_LABEL: Record<ChargeKind, string> = {
  wht: 'WHT (withholding tax)',
  excise: 'FED (federal excise)',
  'other-tax': 'Tax',
  zakat: 'Zakat',
  fee: 'Bank charges',
};

export type ParsedTransaction = {
  merchant: string;
  /** Negative = money out. */
  amount: number;
  date: Date;
  /** The original text, so the user can verify. */
  raw: string;
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

const IGNORE = /\b(otp|one[- ]time|password|verification code|pin\b|do not share|is your code)/i;
const CREDIT = /\b(credited|received|deposit(ed)?|refund(ed)?|reversal|reversed|cash ?back|salary|transferred to you|has been added)\b/i;
const DEBIT = /\b(debited|spent|used|purchase|paid|payment|sent|withdrawn|withdrawal|trx|transaction|charged|deducted|transfer(red)? to)\b/i;
const AMOUNT = /(?:PKR|Rs\.?|Rs)\s*:?\s*([\d,]+(?:\.\d{1,2})?)/i;
const STOP = '(?=\\s+(?:on|via|using|for|ref|from|with|dated|date|card|a\\/c|ac|account|acct|at|in|tid|trx|txn|id|your|by|is|has|ending)\\b|\\s+\\d{4,}|\\s*[.,;:(]|\\s*$)';
const MERCHANT_RES = [
  new RegExp(`\\bat\\s+([A-Za-z0-9&'@*\\-/ ]{2,40}?)${STOP}`, 'i'),
  new RegExp(`\\b(?:to|towards)\\s+([A-Za-z][A-Za-z0-9&'@*\\-/ ]{1,40}?)${STOP}`, 'i'),
  new RegExp(`\\bfrom\\s+([A-Za-z][A-Za-z0-9&'@*\\-/ ]{1,40}?)${STOP}`, 'i'),
];
const GENERIC_MERCHANT = /^(your|you|a\/c|ac|account|card|the|pkr|rs)\b/i;

function titleCase(s: string): string {
  // Short all-caps tokens are usually acronyms (KFC, DHA, PSO) — keep them.
  return s
    .split(' ')
    .map((w) => (/^[A-Z]{2,3}$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

export function parseDate(text: string, now = new Date()): Date | null {
  // 07-Oct-26, 07 Oct 2026, 7-OCT-2026
  let m = text.match(/\b(\d{1,2})[-\s/]([A-Za-z]{3,4})[-\s/,]+(\d{2,4})\b/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    return withTime(new Date(y, MONTHS[m[2].toLowerCase()], Number(m[1])), text);
  }
  // 2026-10-07
  m = text.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return withTime(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])), text);
  // 07/10/2026 or 07-10-26 (day first, as used in Pakistan)
  m = text.match(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const month = Number(m[2]) - 1;
    if (month >= 0 && month < 12) return withTime(new Date(y, month, Number(m[1])), text);
  }
  return null;

  function withTime(d: Date, src: string): Date {
    if (Number.isNaN(d.getTime())) return now;
    const t = src.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?\b/i);
    if (t) {
      let h = Number(t[1]);
      if (t[3]?.toLowerCase() === 'pm' && h < 12) h += 12;
      if (t[3]?.toLowerCase() === 'am' && h === 12) h = 0;
      d.setHours(h, Number(t[2]));
    } else {
      d.setHours(now.getHours(), now.getMinutes());
    }
    return d;
  }
}

export function parseSms(text: string, now = new Date()): ParsedTransaction | null {
  const raw = text.trim();
  if (!raw || IGNORE.test(raw)) return null;
  const amountMatch = raw.match(AMOUNT);
  if (!amountMatch) return null;
  const value = Number(amountMatch[1].replace(/,/g, ''));
  if (!value || !Number.isFinite(value)) return null;

  const credit = CREDIT.test(raw) && !/\bdebited\b/i.test(raw);
  if (!credit && !DEBIT.test(raw)) return null; // e.g. balance-only notices

  let merchant = '';
  const order = credit ? [MERCHANT_RES[2], MERCHANT_RES[0], MERCHANT_RES[1]] : MERCHANT_RES;
  for (const re of order) {
    const m = raw.match(re);
    if (m && !GENERIC_MERCHANT.test(m[1].trim())) {
      merchant = m[1].trim();
      break;
    }
  }
  let label: string | null = null;
  const charge = classifyCharge(raw);
  if (charge && (!merchant || !classifyCharge(merchant))) {
    // Tax/fee alerts rarely name a merchant ("…debited for WHT U/S 231A") — label them so they're recognised.
    label = CHARGE_SMS_LABEL[charge];
  } else if (!merchant) {
    label = credit ? (/\bsalary\b/i.test(raw) ? 'Salary' : 'Money received') : 'Card payment';
  }

  return {
    merchant: label ?? titleCase(merchant).slice(0, 40),
    amount: credit ? value : -value,
    date: parseDate(raw, now) ?? now,
    raw,
  };
}

/** Splits a paste of one or many messages and parses each. */
export function parseSmsBatch(text: string, now = new Date()): ParsedTransaction[] {
  const chunks = text
    .split(/\n\s*\n/)
    .flatMap((chunk) => {
      const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
      // Several one-line messages pasted without blank lines between them.
      const amountLines = lines.filter((l) => AMOUNT.test(l));
      return amountLines.length > 1 && amountLines.length === lines.length ? lines : [lines.join(' ')];
    });
  return chunks.map((c) => parseSms(c, now)).filter((t): t is ParsedTransaction => t !== null);
}
