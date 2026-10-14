#!/bin/bash
cat << 'INNER_EOF' > fix_branch_modal.js
const fs = require('fs');
const file = 'src/components/BranchModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const handleLoginAsBranch = [\s\S]*?};\n/m, `const handleLoginAsBranch = (branch: UserAccount) => {
    const res = login(branch.username || "", branch.pinOrPassword);
    if (res && !res.success) {
      alert(res.message);
    }
  };
`);

content = content.replace(/const handleDeleteBranch = \(id: string\) => {[\s\S]*?const nextUsers/m, `const handleDeleteBranch = (id: string) => {
    const nextUsers`);

fs.writeFileSync(file, content);
INNER_EOF
node fix_branch_modal.js
