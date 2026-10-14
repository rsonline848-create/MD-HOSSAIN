const fs = require('fs');
let code = fs.readFileSync('src/components/CustomersView.tsx', 'utf8');

code = code.replace(
  'let openingDue = c.openingDue || 0;',
  'let openingDue = Number(c.openingDue) || 0;'
);
fs.writeFileSync('src/components/CustomersView.tsx', code);

let dash = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');
dash = dash.replace(
  'openingDueUpToDate += (c.openingDue || 0);',
  'openingDueUpToDate += Number(c.openingDue) || 0;'
);
dash = dash.replace(
  'openingSupplierUpToDate += (s.openingBalance || 0);',
  'openingSupplierUpToDate += Number(s.openingBalance) || 0;'
);
fs.writeFileSync('src/components/DashboardView.tsx', dash);
