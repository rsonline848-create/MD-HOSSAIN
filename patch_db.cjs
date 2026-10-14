const fs = require('fs');
let code = fs.readFileSync('src/db/index.ts', 'utf8');

code = code.replace(
  /if \(err\.message && err\.message\.includes\('terminating connection due to administrator command'\)\) \{/g,
  `if (err.message && (err.message.includes('terminating connection due to administrator command') || err.message.includes('Connection terminated unexpectedly'))) {`
);

fs.writeFileSync('src/db/index.ts', code);
