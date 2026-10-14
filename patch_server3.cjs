const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(/const ai = new GoogleGenAI\(\{ apiKey \}\);/g, 'const ai = new GoogleGenAI({ apiKey, httpOptions: { fetch: globalThis.fetch } });');
fs.writeFileSync('server.ts', code);
