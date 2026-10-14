const fs = require('fs');
let code = fs.readFileSync('src/components/Modals.tsx', 'utf8');
code = code.replace(
  "const [mgrRole, setMgrRole] = useState<'admin' | 'manager'>('manager');",
  "const [mgrRole, setMgrRole] = useState<'admin' | 'manager' | 'branch_manager'>('manager');"
);
fs.writeFileSync('src/components/Modals.tsx', code);
