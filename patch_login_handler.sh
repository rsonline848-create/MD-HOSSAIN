#!/bin/bash
sed -i 's/login(branch.username, branch.pinOrPassword);/const res = login(branch.username || "", branch.pinOrPassword);\n    if (res && !res.success) {\n      alert(res.message);\n    }/g' src/components/BranchModal.tsx
