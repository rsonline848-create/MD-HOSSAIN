const fs = require('fs');
let code = fs.readFileSync('src/components/DueCollectionView.tsx', 'utf8');

code = code.replace(/if \(totalCollected <= 0\) \{/g, 'if (totalCollected <= 0 && numDiscount <= 0) {');
code = code.replace(/alert\('অনুগ্রহ করে আদায়ের পরিমাণ \(নগদ বা অন্যান্য মাধ্যম\) ইনপুট দিন!'\);/g, "alert('অনুগ্রহ করে আদায়ের পরিমাণ বা ডিসকাউন্ট দিন!');");

fs.writeFileSync('src/components/DueCollectionView.tsx', code);
