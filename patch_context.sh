#!/bin/bash
sed -i 's/logout: () => void;/logout: () => void;\n  returnToMainApp: () => void;\n  activeBranchId: string;/g' src/context/AppContext.tsx
sed -i 's/const logout = () => {/const returnToMainApp = () => {\n    localStorage.removeItem("ACTIVE_BRANCH_ID");\n    window.location.reload();\n  };\n\n  const logout = () => {/g' src/context/AppContext.tsx
sed -i 's/login,/login,\n        logout,\n        returnToMainApp,\n        activeBranchId: ACTIVE_BRANCH_ID,/g' src/context/AppContext.tsx
