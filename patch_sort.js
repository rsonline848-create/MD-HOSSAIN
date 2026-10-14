const fs = require('fs');
let content = fs.readFileSync('src/components/DateSalesView.tsx', 'utf8');

const oldSort = `  ].sort((a, b) => {
    const numA = parseInt(a.memo.replace(/\\D/g, '')) || 0;
    const numB = parseInt(b.memo.replace(/\\D/g, '')) || 0;
    return numA - numB;
  });`;

const newSort = `  ].sort((a, b) => {
    const numA = toEnglishNumber(a.memo) || 0;
    const numB = toEnglishNumber(b.memo) || 0;
    return numA - numB;
  });`;

content = content.replace(oldSort, newSort);
fs.writeFileSync('src/components/DateSalesView.tsx', content);
console.log("Patched sort");
