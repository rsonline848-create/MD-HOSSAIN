const fs = require('fs');
let code = fs.readFileSync('src/components/Chatbot.tsx', 'utf8');

code = code.replace(/useAppContext/g, 'useApp');

fs.writeFileSync('src/components/Chatbot.tsx', code);
