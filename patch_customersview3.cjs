const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersView.tsx', 'utf8');

code = code.replace(/currentDue: openingDue \+ addedDue \- paidDue/g, 'currentDue: openingDue + addedDue - paidDue - pays.reduce((sum, p) => sum + Number(p.discount || 0), 0)');

fs.writeFileSync('src/components/CustomersView.tsx', code);
