// Comprehensive translations for ML Electric / Bismillah Traders POS
export type AppLanguage = 'bn' | 'en';

export const translations: Record<string, { bn: string; en: string }> = {
  // Navigation
  'nav.dashboard': { bn: 'ড্যাশবোর্ড', en: 'Dashboard' },
  'nav.new_invoice': { bn: 'নতুন ইনভয়েস (বিক্রি)', en: 'New Invoice (Sale)' },
  'nav.exchange': { bn: 'এক্সচেঞ্জ (মাল পরিবর্তন)', en: 'Exchange (Return & Replace)' },
  'nav.due_collection': { bn: 'বাকি আদায় (পেমেন্ট)', en: 'Due Collection (Payment)' },
  'nav.supplier_bill': { bn: 'মাল ক্রয় (সাপ্লায়ার বিল)', en: 'Purchase & Supplier Bills' },
  'nav.products': { bn: 'প্রোডাক্ট / স্টক', en: 'Products & Stock' },
  'nav.date_sales': { bn: 'তারিখভিত্তিক বিক্রি', en: 'Date-wise Sales' },
  'nav.customers': { bn: 'কাস্টমার লিস্ট', en: 'Customer List' },
  'nav.suppliers': { bn: 'সাপ্লায়ার লিস্ট', en: 'Supplier List' },
  'nav.daily_expenses': { bn: 'দৈনিক খরচ', en: 'Daily Expenses' },
  'nav.cash_tally': { bn: 'ক্যাশ মিলানো', en: 'Cash Tally' },
  'nav.recycle_bin': { bn: 'রিসাইকেল বিন', en: 'Recycle Bin' },
  'nav.backup': { bn: 'ব্যাকআপ ডাউনলোড', en: 'Download Backup' },
  'nav.menu': { bn: 'মেনু বার', en: 'Menu Bar' },
  'nav.collapse': { bn: 'মেনু সংকুচিত করুন', en: 'Collapse Menu' },
  'nav.expand': { bn: 'মেনু প্রসারিত করুন', en: 'Expand Menu' },

  // Header
  'header.branch': { bn: 'ব্রাঞ্চ', en: 'Branch' },
  'header.settings': { bn: 'সেটিংস', en: 'Settings' },
  'header.online_users': { bn: 'অনলাইন ইউজার', en: 'Online Users' },
  'header.logout': { bn: 'লগআউট', en: 'Logout' },
  'header.main_office': { bn: 'প্রধান কার্যালয়', en: 'Head Office' },
  'header.cloud_sync': { bn: 'ক্লাউড লাইভ সিঙ্ক', en: 'Cloud Live Sync' },
  'header.syncing': { bn: 'সিঙ্ক...', en: 'Syncing...' },
  'header.offline': { bn: 'অফলাইন', en: 'Offline' },
  'header.refresh_tooltip': { bn: 'ক্লাউড থেকে তাৎক্ষণিক রিফ্রেশ ও সিঙ্ক করুন', en: 'Refresh & Sync from Cloud' },

  // Settings & Language
  'settings.title': { bn: 'সিস্টেম সেটিংস', en: 'System Settings' },
  'settings.subtitle': { bn: 'ভাষা নির্বাচন, ইমেইল নোটিফিকেশন ও কনফিগারেশন', en: 'Language selection, email notifications & configurations' },
  'settings.language_title': { bn: 'ভাষা নির্বাচন (Language Selection)', en: 'Language Selection' },
  'settings.language_desc': { bn: 'আপনার পছন্দমতো ভাষা নির্বাচন করুন। অ্যাপের সকল লেখা সাথে সাথে পরিবর্তিত হবে।', en: 'Select your preferred language. All text will update instantly across the app.' },
  'settings.lang_bn': { bn: 'বাংলা (Bengali)', en: 'Bengali (বাংলা)' },
  'settings.lang_en': { bn: 'English (ইংরেজি)', en: 'English' },
  'settings.smtp_title': { bn: 'SMTP কনফিগারেশন (ইমেইল সেটিংস)', en: 'SMTP Configuration (Email Settings)' },
  'settings.smtp_enable': { bn: 'অ্যাপ থেকে স্বয়ংক্রিয় ইমেইল নোটিফিকেশন চালু করুন', en: 'Enable outbound email notifications from this app' },
  'settings.save': { bn: 'সেভ করুন', en: 'Save Changes' },
  'settings.cancel': { bn: 'বাতিল', en: 'Cancel' },
  'settings.saved_success': { bn: 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!', en: 'Settings saved successfully!' },

  // Common Actions & Labels
  'common.save': { bn: 'সেভ করুন', en: 'Save' },
  'common.cancel': { bn: 'বাতিল', en: 'Cancel' },
  'common.delete': { bn: 'মুছুন', en: 'Delete' },
  'common.edit': { bn: 'এডিট', en: 'Edit' },
  'common.search': { bn: 'অনুসন্ধান করুন...', en: 'Search...' },
  'common.filter': { bn: 'ফিল্টার', en: 'Filter' },
  'common.print': { bn: 'প্রিন্ট', en: 'Print' },
  'common.download_pdf': { bn: 'পিডিএফ ডাউনলোড', en: 'Download PDF' },
  'common.memo_no': { bn: 'মেমো নং', en: 'Memo No.' },
  'common.date': { bn: 'তারিখ', en: 'Date' },
  'common.time': { bn: 'সময়', en: 'Time' },
  'common.action': { bn: 'অ্যাকশন', en: 'Action' },
  'common.sl': { bn: 'ক্রমিক', en: 'SL' },
  'common.status': { bn: 'অবস্থা', en: 'Status' },
  'common.notes': { bn: 'মন্তব্য / বিবরণ', en: 'Notes / Remarks' },
  'common.loading': { bn: 'লোড হচ্ছে...', en: 'Loading...' },
  'common.confirm': { bn: 'নিশ্চিত করুন', en: 'Confirm' },
  'common.back': { bn: 'ফিরে যান', en: 'Back' },
  'common.add_new': { bn: 'নতুন যোগ করুন', en: 'Add New' },
  'common.kg': { bn: 'কেজি', en: 'KG' },
  'common.taka': { bn: '৳', en: '৳' },

  // Financial terms
  'finance.total': { bn: 'সর্বমোট', en: 'Total' },
  'finance.subtotal': { bn: 'মোট টাকা', en: 'Subtotal' },
  'finance.discount': { bn: 'ছাড় (টাকা)', en: 'Discount' },
  'finance.cash_paid': { bn: 'নগদ জমা', en: 'Cash Paid' },
  'finance.online_paid': { bn: 'অনলাইন জমা', en: 'Online Paid' },
  'finance.due': { bn: 'বাকি টাকা', en: 'Due Balance' },
  'finance.previous_due': { bn: 'পূর্বের বাকি', en: 'Previous Due' },
  'finance.total_due': { bn: 'সর্বমোট বাকি', en: 'Total Due' },
  'finance.grand_total': { bn: 'সর্বমোট বিল', en: 'Grand Total' },
  'finance.net_profit': { bn: 'সর্বমোট নিট লাভ', en: 'Net Profit' },
  'finance.net_loss': { bn: 'সর্বমোট নিট লোকসান', en: 'Net Loss' },
  'finance.gross_profit': { bn: 'গ্রস লাভ', en: 'Gross Profit' },
  'finance.cogs': { bn: 'মালের ক্রয়মূল্য (COGS)', en: 'Cost of Goods (COGS)' },
  'finance.expenses': { bn: 'দোকানের মোট খরচ', en: 'Total Expenses' },
  'finance.margin': { bn: 'লাভের অনুপাত', en: 'Profit Margin' },

  // Customer & Supplier
  'customer.title': { bn: 'কাস্টমার', en: 'Customer' },
  'customer.select': { bn: 'কাস্টমার নির্বাচন করুন', en: 'Select Customer' },
  'customer.name': { bn: 'কাস্টমারের নাম', en: 'Customer Name' },
  'customer.phone': { bn: 'মোবাইল নম্বর', en: 'Phone Number' },
  'customer.address': { bn: 'ঠিকানা', en: 'Address' },
  'supplier.title': { bn: 'মহাজন / সাপ্লায়ার', en: 'Supplier / Creditor' },
  'supplier.select': { bn: 'সাপ্লায়ার নির্বাচন করুন', en: 'Select Supplier' },
  'supplier.name': { bn: 'সাপ্লায়ারের নাম', en: 'Supplier Name' },
  'supplier.phone': { bn: 'মোবাইল নম্বর', en: 'Phone Number' },
  'supplier.company': { bn: 'কোম্পানি / ঠিকানা', en: 'Company / Address' },

  // Products & Stock
  'product.name': { bn: 'পণ্যের নাম / বিবরণ', en: 'Product Name / Description' },
  'product.code': { bn: 'প্রোডাক্ট কোড', en: 'Product Code' },
  'product.category': { bn: 'ক্যাটাগরি', en: 'Category' },
  'product.purchase_price': { bn: 'ক্রয়মূল্য', en: 'Purchase Price' },
  'product.sale_price': { bn: 'বিক্রয়মূল্য', en: 'Sale Price' },
  'product.stock': { bn: 'মজুদ স্টক', en: 'Stock Quantity' },
  'product.profit_per_kg': { bn: 'লাভ (প্রতি কেজি)', en: 'Profit (per KG)' },
  'product.low_stock': { bn: 'কম স্টক', en: 'Low Stock' },
  'product.adjust_stock': { bn: 'স্টক সমন্বয়', en: 'Adjust Stock' },
  'product.stock_sheet': { bn: 'স্টক শিট প্রিন্ট', en: 'Print Stock Sheet' },

  // Invoices & Exchange
  'invoice.create_sale': { bn: 'নতুন বিক্রয় / জমা ইনভয়েস', en: 'New Sales / Credit Invoice' },
  'invoice.items_title': { bn: 'মালের বিবরণ / আইটেম সমূহ', en: 'Item Particulars / Products' },
  'invoice.save_print': { bn: 'মেমো সেভ ও প্রিন্ট করুন', en: 'Save & Print Invoice' },
  'invoice.reset': { bn: 'রিসেট', en: 'Reset' },
  'exchange.title': { bn: 'পণ্য পরিবর্তন / এক্সচেঞ্জ ও মাল ফেরত', en: 'Product Exchange & Return' },
  'exchange.returned_items': { bn: 'কাস্টমারের ফেরত দেওয়া মাল (স্টকে যোগ +)', en: 'Returned Items (Stock Plus +)' },
  'exchange.new_items': { bn: 'কাস্টমারকে দেওয়া নতুন মাল (স্টক থেকে বিয়োগ -)', en: 'New Items Taken (Stock Minus -)' },
  'exchange.save_print': { bn: 'এক্সচেঞ্জ মেমো সেভ ও প্রিন্ট', en: 'Save & Print Exchange Memo' },

  // Date Sales & Filter
  'datesales.title': { bn: 'তারিখ ভিত্তিক বিক্রয় ও লাভ-ক্ষতি হিসাব', en: 'Date-wise Sales & Profit-Loss Analysis' },
  'datesales.start': { bn: 'শুরু:', en: 'Start:' },
  'datesales.end': { bn: 'শেষ:', en: 'End:' },
  'datesales.search_btn': { bn: 'খুঁজুন', en: 'Search' },
  'datesales.today': { bn: 'আজকে', en: 'Today' },
  'datesales.yesterday': { bn: 'গতকাল', en: 'Yesterday' },
  'datesales.last_7_days': { bn: 'গত ৭ দিন', en: 'Last 7 Days' },
  'datesales.this_month': { bn: 'চলতি মাস', en: 'This Month' },
  'datesales.toggle_pnl': { bn: '📊 লাভ-ক্ষতি ও মুনাফা সামারি দেখুন', en: '📊 View Profit & Loss Summary' },
  'datesales.hide_pnl': { bn: 'লাভ-ক্ষতি সামারি লুকান', en: 'Hide Profit & Loss Summary' },
  'datesales.statement_title': { bn: 'লাভ-ক্ষতি ও মুনাফা বিবরণী (Profit & Loss Statement)', en: 'Profit & Loss Statement' },

  // Logout modal
  'logout.title': { bn: 'লগআউট নিশ্চিতকরণ', en: 'Confirm Logout' },
  'logout.message': { bn: 'আপনি কি নিশ্চিত যে সফটওয়্যার থেকে লগআউট করতে চান?', en: 'Are you sure you want to log out from the application?' },
  'logout.btn_confirm': { bn: 'হ্যাঁ, লগআউট করুন', en: 'Yes, Log Out' },
  'logout.btn_cancel': { bn: 'না, বাতিল', en: 'No, Cancel' }
};

export const getTranslation = (key: string, lang: AppLanguage = 'bn', fallback?: string): string => {
  if (translations[key]) {
    return translations[key][lang] || translations[key].bn || fallback || key;
  }
  return fallback || key;
};
