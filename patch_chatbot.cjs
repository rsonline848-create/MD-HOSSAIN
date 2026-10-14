const fs = require('fs');
let code = fs.readFileSync('src/components/Chatbot.tsx', 'utf8');

code = code.replace(/className=\{\\\`flex \\\$\{/g, "className={`flex ${");
code = code.replace(/\\\`\}/g, "`}");
code = code.replace(/className=\{\\\`flex gap-2 max-w-\[85\%\] \\\$\{/g, "className={`flex gap-2 max-w-[85%] ${");
code = code.replace(/className=\{\\\`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 \\\$\{/g, "className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${");
code = code.replace(/className=\{\\\`p-3 rounded-2xl text-sm whitespace-pre-wrap \\\$\{/g, "className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${");

// Actually just replacing all "\\`" with "`" should be sufficient if I used string literal escaping.
// Let's just rewrite Chatbot.tsx completely without using bash heredoc with backticks.

