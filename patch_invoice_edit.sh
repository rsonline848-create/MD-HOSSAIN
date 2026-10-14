#!/bin/bash
cat << 'INNER_EOF' > fix_labels.js
const fs = require('fs');
const file = 'src/components/DateSalesView.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update modal title
content = content.replace(
  /<h3 className="text-lg font-bold text-slate-800">ইনভয়েস এডিট \(\{editingInvoice\.invoiceNo\}\)<\/h3>/,
  '<h3 className="text-lg font-bold text-slate-800">ইনভয়েস তথ্য সংশোধন করুন ({editingInvoice.invoiceNo})</h3>'
);

// Update labels
content = content.replace(
  /<label className="block text-sm font-semibold text-slate-700 mb-1">মেমো নম্বর<\/label>/g,
  '<label className="block text-sm font-semibold text-slate-700 mb-1">মেমো নাম্বার</label>'
);

content = content.replace(
  /<label className="block text-sm font-semibold text-slate-700 mb-1">বিক্রির টাকা \(৳\)<\/label>/g,
  '<label className="block text-sm font-semibold text-slate-700 mb-1">বিক্রির টাকা</label>'
);

content = content.replace(
  /<label className="block text-sm font-semibold text-slate-700 mb-1">ডিসকাউন্ট \(৳\)<\/label>/g,
  '<label className="block text-sm font-semibold text-slate-700 mb-1">ডিসকাউন্ট(লেছ)</label>'
);

content = content.replace(
  /<label className="block text-sm font-semibold text-slate-700 mb-1">নগদ প্রদান \(৳\)<\/label>/g,
  '<label className="block text-sm font-semibold text-slate-700 mb-1">নগদ জমা</label>'
);

// We need to find the online paid label, let's check what it currently is
INNER_EOF
node fix_labels.js
