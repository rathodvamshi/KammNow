const fs = require('fs');

let index = fs.readFileSync('app/(tabs)/index.tsx', 'utf8');

index = index.replace(/onSearchManually=\{[\s\S]*?\}\}/g, "");
index = index.replace(/onContinueSaved=\{[\s\S]*?\}\}/g, "");
index = index.replace(/hasSavedAddresses=\{savedAddresses.length > 0\}/g, "");

fs.writeFileSync('app/(tabs)/index.tsx', index);
console.log("Fixed props!");
