const fs = require('fs');
let code = fs.readFileSync('src/components/Chatbot.tsx', 'utf8');

code = code.replace(/invoices\.slice/g, '(invoices || []).slice');
code = code.replace(/customers\.length/g, '(customers || []).length');
code = code.replace(/customers\.map/g, '(customers || []).map');
code = code.replace(/products\.map/g, '(products || []).map');
code = code.replace(/dailyExpenses\.slice/g, '(dailyExpenses || []).slice');
code = code.replace(/suppliers\.map/g, '(suppliers || []).map');

fs.writeFileSync('src/components/Chatbot.tsx', code);
