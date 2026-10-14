#!/bin/bash
cat << 'INNER_EOF' > fix_header.cjs
const fs = require('fs');
const file = 'src/components/Header.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const { currentUser, setCurrentUser, users, setActiveModal, logout, isCloudSynced, cloudSyncTime, isSyncingNow, forceSyncFromCloud } = useApp\(\);/,
  "const { currentUser, setCurrentUser, users, setActiveModal, logout, returnToMainApp, activeBranchId, isCloudSynced, cloudSyncTime, isSyncingNow, forceSyncFromCloud } = useApp();"
);

content = content.replace(
  /import { User, LogOut, ShieldCheck, Key, Cloud, CloudCheck, RefreshCw, Settings, MapPin } from 'lucide-react';/,
  "import { User, LogOut, ShieldCheck, Key, Cloud, CloudCheck, RefreshCw, Settings, MapPin, Home } from 'lucide-react';"
);

content = content.replace(
  /<h1 className="text-xl sm:text-2xl font-bold tracking-wide flex items-center gap-2">[\s\S]*?<\/h1>/,
  `<div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide flex items-center gap-2">
                <span>ML Electric</span>
              </h1>
              {activeBranchId !== 'ml_electric_main' ? (
                <span className="text-sm font-semibold text-emerald-300">শাখা: {currentUser.name}</span>
              ) : (
                <span className="text-xs sm:text-sm font-medium text-indigo-200">প্রধান কার্যালয় (এম এল ইলেকট্রিক)</span>
              )}
            </div>`
);

content = content.replace(
  /{[\s\S]*?Branch & Settings Buttons[\s\S]*?}/,
  `{/* Return to Main App, Branch & Settings Buttons */}
          {activeBranchId !== 'ml_electric_main' && (
            <button
              onClick={returnToMainApp}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-sm hover:shadow active:scale-95 transition cursor-pointer"
              title="প্রধান শাখায় ফিরে যান"
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden md:inline">প্রধান শাখায় ফিরে যান</span>
            </button>
          )}`
);

fs.writeFileSync(file, content);
INNER_EOF
node fix_header.cjs
