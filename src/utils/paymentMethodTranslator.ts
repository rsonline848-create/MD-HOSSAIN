export const translateOnlineMethod = (method?: string): string => {
  switch (method) {
    case 'bkash': return 'বিকাশ';
    case 'nagad': return 'নগদ';
    case 'rocket': return 'রকেট';
    case 'bank': return 'ব্যাংক';
    case 'cheque': return 'চেক';
    case 'goods': return 'মাল বাবদ';
    default: return method || 'অন্যান্য';
  }
};
