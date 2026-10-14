const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const importStatement = `import { ErrorBoundary } from './components/ErrorBoundary';\nimport Chatbot from './components/Chatbot';`;
code = code.replace(`import { ErrorBoundary } from './components/ErrorBoundary';`, importStatement);

const renderStatement = `      <SettingsModal />
      <BranchModal />
      <Chatbot />`;
code = code.replace(`      <SettingsModal />\n      <BranchModal />`, renderStatement);

fs.writeFileSync('src/App.tsx', code);
