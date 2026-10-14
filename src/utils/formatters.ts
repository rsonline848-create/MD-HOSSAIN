// Bengali and English number conversion & formatting utilities

const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const toBengaliNumber = (num: number | string | undefined | null): string => {
  if (num === undefined || num === null || num === '') return '০';
  const str = num.toString();
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

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  try {
    const str = String(dateStr).trim();
    if (!str) return '';
    let y = '', m = '', d = '';
    
    // ISO string with T
    let p = str;
    if (str.includes('T')) {
      p = str.split('T')[0];
    }
    
    // YYYY-M-D or YYYY/M/D
    const ymdMatch = p.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (ymdMatch) {
      y = ymdMatch[1];
      m = ymdMatch[2].padStart(2, '0');
      d = ymdMatch[3].padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
    
    // DD/MM/YYYY, DD-MM-YYYY or MM/DD/YYYY
    const dmyMatch = p.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
      const p1 = parseInt(dmyMatch[1], 10);
      const p2 = parseInt(dmyMatch[2], 10);
      y = dmyMatch[3];
          
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
    
    return p;
  } catch {
    return dateStr;
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

export const formatDateTimeBengali = (isoStr: string): string => {
  if (!isoStr) return '';
  try {
    const date = new Date(isoStr);
    // Fallback if date is invalid
    if (isNaN(date.getTime())) return isoStr;
    
    return new Intl.DateTimeFormat('bn-BD', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (e) {
    return isoStr;
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
