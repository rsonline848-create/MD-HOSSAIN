// Bengali and English number conversion & formatting utilities
import type { SupplierBillItem } from '../types';

const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

let currentAppLanguage: 'bn' | 'en' = 
  typeof window !== 'undefined' && localStorage.getItem('ML_ELECTRIC_LANGUAGE') === 'en' ? 'en' : 'bn';

export const setFormatterLanguage = (lang: 'bn' | 'en') => {
  currentAppLanguage = lang;
};

export const getFormatterLanguage = (): 'bn' | 'en' => currentAppLanguage;

export const toBengaliNumber = (num: number | string | undefined | null, forceBn = false): string => {
  if (num === undefined || num === null || num === '') {
    return (!forceBn && currentAppLanguage === 'en') ? '0' : '০';
  }
  let str: string;
  if (typeof num === 'number') {
    if (isNaN(num)) return (!forceBn && currentAppLanguage === 'en') ? '0' : '০';
    // Clean floating point noise, max 2 decimal places
    const cleanNum = Number.isInteger(num) ? num : Math.round((num + Number.EPSILON) * 100) / 100;
    str = cleanNum.toString();
  } else {
    str = num.toString().trim();
    // If it's a numeric string with floating point artifacts (e.g. "154124.2599999979")
    if (/^-?\d+\.\d+$/.test(str)) {
      const parsed = parseFloat(str);
      if (!isNaN(parsed)) {
        str = (Math.round((parsed + Number.EPSILON) * 100) / 100).toString();
      }
    }
  }

  if (!forceBn && currentAppLanguage === 'en') {
    // If in English mode and the string has Bengali digits, convert them to English
    let res = str;
    for (let i = 0; i < 10; i++) {
      res = res.replaceAll(bengaliDigits[i], englishDigits[i]);
    }
    return res;
  }
  return str.replace(/\d/g, (d) => bengaliDigits[parseInt(d, 10)] || d);
};

export const toEnglishNumber = (str: string): number => {
  if (!str) return 0;
  let result = str.toString();
  for (let i = 0; i < 10; i++) {
    result = result.replaceAll(bengaliDigits[i], englishDigits[i]);
  }
  const clean = result.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Converts any Bengali digits (০-৯) to English digits (0-9).
 * Preserves all non-digit characters.
 */
export const toEnglishDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  let str = String(val);
  for (let i = 0; i < 10; i++) {
    str = str.replaceAll(bengaliDigits[i], englishDigits[i]);
  }
  return str;
};

/**
 * Specifically for numeric input fields (quantities, prices, cash, discount, etc.):
 * Automatically converts Bengali digits to English digits, allowing only 0-9 and at most one decimal point.
 */
export const normalizeNumericInput = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  let str = toEnglishDigits(val);
  str = str.replace(/[^0-9.]/g, '');
  const parts = str.split('.');
  if (parts.length > 2) {
    str = parts[0] + '.' + parts.slice(1).join('');
  }
  return str;
};

/**
 * For memo numbers, receipt numbers, codes, phone numbers, etc.:
 * Converts any Bengali digits to English digits while preserving letters and symbols.
 */
export const normalizeInputDigits = (val: string | number | undefined | null): string => {
  if (val === undefined || val === null) return '';
  return toEnglishDigits(val);
};

export const formatCurrency = (amount: number | string | undefined | null, useBengali = false): string => {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(num);

  if (useBengali) {
    return `${toBengaliNumber(formatted)} ৳`;
  }
  return `${formatted} ৳`;
};

export const formatDate = (dateInput: string | number | Date | null | undefined): string => {
  if (!dateInput) return '';
  try {
    if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) return '';
      const day = String(dateInput.getDate()).padStart(2, '0');
      const month = String(dateInput.getMonth() + 1).padStart(2, '0');
      const year = dateInput.getFullYear();
      return `${day}/${month}/${year}`;
    }

    if (typeof dateInput === 'number') {
      const dObj = new Date(dateInput);
      if (isNaN(dObj.getTime())) return '';
      const day = String(dObj.getDate()).padStart(2, '0');
      const month = String(dObj.getMonth() + 1).padStart(2, '0');
      const year = dObj.getFullYear();
      return `${day}/${month}/${year}`;
    }

    let str = String(dateInput).trim();
    if (!str) return '';

    // Convert any Bengali numerals if present (e.g. ২৩-১০-২০২৬)
    str = str.replace(/[০-৯]/g, (ch) => String('০১২৩৪৫৬৭৮৯'.indexOf(ch)));

    // ISO string with T or space
    if (str.includes('T')) {
      str = str.split('T')[0];
    } else if (str.includes(' ')) {
      const parts = str.split(' ');
      if (parts[0] && (parts[0].includes('-') || parts[0].includes('/'))) {
        str = parts[0];
      }
    }

    // YYYY-M-D or YYYY/M/D
    const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      const y = ymdMatch[1];
      const m = ymdMatch[2].padStart(2, '0');
      const d = ymdMatch[3].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }

    // DD/MM/YYYY, DD-MM-YYYY or MM/DD/YYYY
    const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      const y = dmyMatch[3];
      let d = '';
      let m = '';

      if (p1 > 12 && p2 <= 12) {
        // DD-MM-YYYY
        d = String(p1).padStart(2, '0');
        m = String(p2).padStart(2, '0');
      } else if (p2 > 12 && p1 <= 12) {
        // MM-DD-YYYY
        m = String(p1).padStart(2, '0');
        d = String(p2).padStart(2, '0');
      } else {
        // Assume DD-MM-YYYY in standard BD notation
        d = String(p1).padStart(2, '0');
        m = String(p2).padStart(2, '0');
      }
      return `${d}/${m}/${y}`;
    }

    // Fallback try standard Date parsing
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getDate()).padStart(2, '0');
      const month = String(parsed.getMonth() + 1).padStart(2, '0');
      const year = parsed.getFullYear();
      return `${day}/${month}/${year}`;
    }

    return str;
  } catch {
    return String(dateInput || '');
  }
};

export const getTodayDateInput = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getFormattedCurrentTime = (): string => {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Normalizes any date representation (ISO string, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, MM/DD/YYYY, timestamp)
 * into a standard YYYY-MM-DD format string.
 */
export const normalizeDate = (dateVal?: string | null): string => {
  if (!dateVal) return '';
  const str = String(dateVal).trim();
  if (!str) return '';

  // Already standard YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // ISO string with T
  if (str.includes('T')) {
    const p = str.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
  }

  // YYYY-M-D or YYYY/M/D
  const ymdMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY, DD-MM-YYYY or MM/DD/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const year = dmyMatch[3];
    
    if (p1 > 12 && p2 <= 12) {
      // Definitely DD-MM-YYYY
      const day = String(p1).padStart(2, '0');
      const month = String(p2).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else if (p2 > 12 && p1 <= 12) {
      // Definitely MM-DD-YYYY
      const month = String(p1).padStart(2, '0');
      const day = String(p2).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else {
      // Default assume DD-MM-YYYY in standard BD notation
      const day = String(p1).padStart(2, '0');
      const month = String(p2).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  return str;
};

/**
 * Checks if two date representations point to the exact same calendar day
 */
export const isSameDate = (d1?: string | null, d2?: string | null): boolean => {
  if (!d1 || !d2) return false;
  return normalizeDate(d1) === normalizeDate(d2);
};

export const numberToBengaliWords = (amount: number): string => {
  if (!amount || amount === 0) return 'শূন্য টাকা মাত্র';
  
  const ones = [
    '', 'এক', 'দুই', 'তিন', 'চার', 'পাঁচ', 'ছয়', 'সাত', 'আট', 'নয়', 'দশ', 
    'এগারো', 'বারো', 'তেরো', 'চৌদ্দ', 'পনেরো', 'ষোলো', 'সতেরো', 'আঠারো', 'উনিশ', 'বিশ',
    'একুশ', 'বাইশ', 'তেইশ', 'চব্বিশ', 'পঁচিশ', 'ছাব্বিশ', 'সাতাশ', 'আটাশ', 'উনত্রিশ', 'ত্রিশ',
    'একত্রিশ', 'বত্রিশ', 'তেত্রিশ', 'চৌত্রিশ', 'পঁয়ত্রিশ', 'ছত্রিশ', 'সাইত্রিশ', 'আটত্রিশ', 'উনচল্লিশ', 'চল্লিশ',
    'একচল্লিশ', 'বিয়াল্লিশ', 'তেতাল্লিশ', 'চুয়াল্লিশ', 'পঁয়তাল্লিশ', 'ছেচল্লিশ', 'সাতচল্লিশ', 'আটচল্লিশ', 'উনপঞ্চাশ', 'পঞ্চাশ',
    'একান্ন', 'বায়ান্ন', 'তিপ্পান্ন', 'চুয়ান্ন', 'পঞ্চান্ন', 'ছাপ্পান্ন', 'সাতান্ন', 'আটান্ন', 'উনষাট', 'ষাট',
    'একষট্টি', 'বাষট্টি', 'তেষট্টি', 'চৌষট্টি', 'পঁয়ষট্টি', 'ছেষট্টি', 'সাতষট্টি', 'আটষট্টি', 'উনসত্তর', 'সত্তর',
    'একাত্তর', 'বাহাত্তর', 'তিয়াত্তর', 'চুয়াত্তর', 'পঁচাত্তর', 'ছিয়াত্তর', 'সাতাত্তর', 'আটাত্তর', 'উনআশি', 'আশি',
    'একাশি', 'বিরাশি', 'তিরাশি', 'চুরাশি', 'পঁচাশি', 'ছিয়াশি', 'সাতাশি', 'আটাশি', 'উননব্বই', 'নব্বই',
    'একানব্বই', 'বিরানব্বই', 'তিরানব্বই', 'চুরানব্বই', 'পঁচানব্বই', 'ছিয়ানব্বই', 'সাতানব্বই', 'আটানব্বই', 'নিরানব্বই'
  ];

  const convertTwoDigits = (n: number): string => {
    if (n < 100) return ones[n] || '';
    return '';
  };

  const convertBelowThousand = (n: number): string => {
    let word = '';
    const hundred = Math.floor(n / 100);
    const remainder = n % 100;
    if (hundred > 0) {
      word += (hundred === 1 ? 'একশত' : `${ones[hundred]} শত`);
    }
    if (remainder > 0) {
      word += (word ? ' ' : '') + convertTwoDigits(remainder);
    }
    return word;
  };

  const convertNumber = (num: number): string => {
    if (num === 0) return '';
    let result = '';
    const crore = Math.floor(num / 10000000);
    let rem = num % 10000000;
    const lakh = Math.floor(rem / 100000);
    rem = rem % 100000;
    const thousand = Math.floor(rem / 1000);
    rem = rem % 1000;

    if (crore > 0) {
      result += `${convertNumber(crore)} কোটি `;
    }
    if (lakh > 0) {
      result += `${convertBelowThousand(lakh)} লাখ `;
    }
    if (thousand > 0) {
      result += `${convertBelowThousand(thousand)} হাজার `;
    }
    if (rem > 0) {
      result += `${convertBelowThousand(rem)} `;
    }
    return result.trim();
  };

  try {
    const rounded = Math.round(Math.abs(amount));
    const words = convertNumber(rounded);
    return words ? `${words} টাকা মাত্র` : `${toBengaliNumber(rounded)} টাকা মাত্র`;
  } catch {
    return `${toBengaliNumber(amount)} টাকা মাত্র`;
  }
};

export const formatDateTimeBengali = (isoStr: string | number | Date): string => {
  if (!isoStr) return '';
  try {
    const date = new Date(isoStr);
    if (isNaN(date.getTime())) return String(isoStr);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hoursStr = String(hours).padStart(2, '0');

    return `${day}/${month}/${year}, ${hoursStr}:${minutes} ${ampm}`;
  } catch (e) {
    return String(isoStr);
  }
};

export const getRelativeTimeBengali = (isoStr: string): string => {
  if (!isoStr) return 'তথ্য নেই';
  try {
    const time = new Date(isoStr).getTime();
    if (isNaN(time)) return 'তথ্য নেই';
    const diffSeconds = Math.floor((Date.now() - time) / 1000);
    if (diffSeconds < 60) return 'এইমাত্র (সক্রিয়)';
    if (diffSeconds < 3600) return `${toBengaliNumber(Math.floor(diffSeconds / 60))} মিনিট আগে`;
    if (diffSeconds < 86400) return `${toBengaliNumber(Math.floor(diffSeconds / 3600))} ঘণ্টা আগে`;
    if (diffSeconds < 86400 * 7) return `${toBengaliNumber(Math.floor(diffSeconds / 86400))} দিন আগে`;
    return formatDateTimeBengali(isoStr);
  } catch {
    return 'তথ্য নেই';
  }
};

/**
 * Checks if a date falls within a start and end date (inclusive)
 */
export const isDateInRange = (d?: string | null, start?: string | null, end?: string | null): boolean => {
  if (!d || !start || !end) return false;
  const dn = normalizeDate(d);
  const sn = normalizeDate(start);
  const en = normalizeDate(end);
  if (!dn || !sn || !en) return false;
  
  return dn >= sn && dn <= en;
};

/**
 * Natural numerical comparator for product names (e.g. 1.1, 4.2, 4.2round, 4.3, 5.5, 5.5squre, 6round, 10.10).
 * Sorts numbers in ascending order (smaller at the top, larger at the bottom).
 */
export const compareProductNames = (nameA: string, nameB: string): number => {
  const normalize = (str: string) => {
    const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return (str || '')
      .replace(/[০-৯]/g, (d) => String(bn.indexOf(d)))
      .trim()
      .toLowerCase();
  };

  const normA = normalize(nameA);
  const normB = normalize(nameB);

  if (normA === normB) return 0;

  const parseNumParts = (numStr: string) => {
    if (!numStr) return [];
    return numStr.split('.').map((p) => parseInt(p, 10) || 0);
  };

  // Match optional prefix, the embedded/leading number, and remainder suffix
  // e.g. "6round" -> prefix: "", num: "6", suffix: "round"
  // e.g. "5.5squre" -> prefix: "", num: "5.5", suffix: "squre"
  // e.g. "10.10" -> prefix: "", num: "10.10", suffix: ""
  // e.g. "রড 4.2" -> prefix: "রড ", num: "4.2", suffix: ""
  const matchA = normA.match(/^(.*?)(\d+(?:\.\d+)*)(.*)$/);
  const matchB = normB.match(/^(.*?)(\d+(?:\.\d+)*)(.*)$/);

  if (matchA && matchB) {
    const prefixA = matchA[1].replace(/[\s\-_]/g, '');
    const prefixB = matchB[1].replace(/[\s\-_]/g, '');

    // If both have the same prefix (including both having no prefix, like "6round" vs "5.5squre")
    if (prefixA === prefixB) {
      const partsA = parseNumParts(matchA[2]);
      const partsB = parseNumParts(matchB[2]);
      const maxLen = Math.max(partsA.length, partsB.length);

      for (let i = 0; i < maxLen; i++) {
        const valA = partsA[i] ?? 0;
        const valB = partsB[i] ?? 0;
        if (valA !== valB) {
          return valA - valB;
        }
      }

      // If numeric values are identical, compare remaining suffix (e.g. "4.2round" vs "4.2square")
      const suffixA = (matchA[3] || '').trim();
      const suffixB = (matchB[3] || '').trim();
      return suffixA.localeCompare(suffixB, undefined, { numeric: true, sensitivity: 'base' });
    }

    // If both start with numbers (no prefix at all)
    if (!prefixA && !prefixB) {
      const partsA = parseNumParts(matchA[2]);
      const partsB = parseNumParts(matchB[2]);
      const maxLen = Math.max(partsA.length, partsB.length);

      for (let i = 0; i < maxLen; i++) {
        const valA = partsA[i] ?? 0;
        const valB = partsB[i] ?? 0;
        if (valA !== valB) {
          return valA - valB;
        }
      }
    }
  }

  // Fallback to standard natural alphanumeric sort
  return normA.localeCompare(normB, undefined, { numeric: true, sensitivity: 'base' });
};

/**
 * Extracts structured items from a supplier bill,
 * either from the bill.items array or by parsing bill.itemsDescription.
 */
export const extractSupplierBillItems = (
  bill: { items?: SupplierBillItem[]; itemsDescription?: string; id?: string; totalAmount?: number }
): SupplierBillItem[] => {
  if (Array.isArray(bill.items) && bill.items.length > 0) {
    return bill.items.map((it, idx) => ({
      id: it.id || `item_${idx}_${bill.id || Date.now()}`,
      productId: it.productId,
      name: it.name || 'পণ্য',
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      lineTotal: it.lineTotal !== undefined ? Number(it.lineTotal) : Math.round((Number(it.quantity) || 0) * (Number(it.unitPrice) || 0))
    }));
  }

  const items: SupplierBillItem[] = [];
  if (!bill.itemsDescription) return items;

  let raw = bill.itemsDescription.trim();
  // Strip [নোট: ...]
  raw = raw.replace(/\[নোট:\s*[^\]]+\]/, '').trim();
  raw = raw.replace(/,\s*$/, '').trim();

  // Split by newlines, semicolons, or commas between products
  const parts = raw.split(/\n|(?<=\))\s*,\s*|;\s*/).map(p => p.trim()).filter(Boolean);
  parts.forEach((part, idx) => {
    // Pattern: Name (Qty @ Rate) or Name (Qty KG @ Rate ৳)
    const m = part.match(/^(.*?)\s*\((.*?)\s*@\s*(.*?)\)$/);
    if (m) {
      const name = m[1].trim();
      const rawQty = m[2].replace(/[^০-৯0-9.]/g, '');
      const rawRate = m[3].replace(/[^০-৯0-9.]/g, '');
      const qtyNum = toEnglishNumber(rawQty) || 0;
      const rateNum = toEnglishNumber(rawRate) || 0;
      items.push({
        id: `parsed_${idx}_${bill.id || Date.now()}`,
        name: name || 'পণ্য',
        quantity: qtyNum,
        unitPrice: rateNum,
        lineTotal: Math.round(qtyNum * rateNum)
      });
    } else if (part) {
      items.push({
        id: `parsed_${idx}_${bill.id || Date.now()}`,
        name: part,
        quantity: 0,
        unitPrice: 0,
        lineTotal: 0
      });
    }
  });

  return items;
};


