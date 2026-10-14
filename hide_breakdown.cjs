const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

const customerBreakdownRegex = /<div className="flex flex-col pt-3 mt-1 border-t border-slate-100 text-\[11px\] text-slate-500 space-y-1">\s*<div className="flex justify-between">\s*<span>প্রারম্ভিক জের \(Opening\):<\/span>\s*<span className="font-semibold text-slate-700">\{toBengaliNumber\(openingDueUpToDate\)\} ৳<\/span>\s*<\/div>\s*<div className="flex justify-between">\s*<span>\(\+\) নতুন বাকিতে বিক্রি:<\/span>\s*<span className="font-semibold text-rose-600">\{toBengaliNumber\(invoicesDueUpToDate\)\} ৳<\/span>\s*<\/div>\s*<div className="flex justify-between">\s*<span>\(-\) মোট বাকি আদায়:<\/span>\s*<span className="font-semibold text-emerald-600">\{toBengaliNumber\(paymentsUpToDate\)\} ৳<\/span>\s*<\/div>\s*<\/div>/g;

const supplierBreakdownRegex = /<div className="flex flex-col pt-3 mt-1 border-t border-slate-100 text-\[11px\] text-slate-500 space-y-1">\s*<div className="flex justify-between">\s*<span>প্রারম্ভিক পাওনা \(Opening\):<\/span>\s*<span className="font-semibold text-slate-700">\{toBengaliNumber\(openingSupplierUpToDate\)\} ৳<\/span>\s*<\/div>\s*<div className="flex justify-between">\s*<span>\(\+\) নতুন ক্রয় বিল:<\/span>\s*<span className="font-semibold text-rose-600">\{toBengaliNumber\(supplierBillsUpToDate\)\} ৳<\/span>\s*<\/div>\s*<div className="flex justify-between">\s*<span>\(-\) মোট মহাজন পরিশোধ:<\/span>\s*<span className="font-semibold text-emerald-600">\{toBengaliNumber\(supplierPaymentsUpToDate\)\} ৳<\/span>\s*<\/div>\s*<\/div>/g;

code = code.replace(customerBreakdownRegex, '');
code = code.replace(supplierBreakdownRegex, '');

// Also we should restore the CSS of the parent divs to not be flex-col justify-between if we want it to look like other cards, or just leave it. 
// Other cards: `<div className="bg-white rounded-xl p-4 border-l-4 border-l-red-600 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">` -> remove `flex flex-col justify-between` if we want.
code = code.replace(/transition flex flex-col justify-between/g, 'transition');

fs.writeFileSync('src/components/DashboardView.tsx', code);
