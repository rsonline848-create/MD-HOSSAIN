#!/bin/bash
sed -i 's/const STORAGE_KEY_PREFIX = '\''ML_ELECTRIC_'\'';/const ACTIVE_BRANCH_ID = typeof window !== "undefined" ? localStorage.getItem("ACTIVE_BRANCH_ID") || "ml_electric_main" : "ml_electric_main";\nconst FIRESTORE_SHOP_DOC_ID = ACTIVE_BRANCH_ID;\nconst STORAGE_KEY_PREFIX = `ML_ELECTRIC_${ACTIVE_BRANCH_ID}_`;/g' src/context/AppContext.tsx
sed -i 's/const FIRESTORE_SHOP_DOC_ID = '\''ml_electric_main'\'';//g' src/context/AppContext.tsx
