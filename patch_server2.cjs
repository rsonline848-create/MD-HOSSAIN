const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/res.status\(500\)\.json\(\{ error: "Failed to process chat message." \}\);/g, 'res.status(500).json({ error: e.message || "Failed to process chat message." });');

fs.writeFileSync('server.ts', code);
