const fs = require('fs');
let content = fs.readFileSync('src/types/index.ts', 'utf8');
content = content.replace(/billDate\?: string;\n/g, '');
fs.writeFileSync('src/types/index.ts', content);
