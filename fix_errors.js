const fs = require('fs');

// Fix JobCard.tsx
let jobCard = fs.readFileSync('src/components/molecules/JobCard.tsx', 'utf8');
jobCard = jobCard.replace("import {", "import { Pressable } from 'react-native';\nimport {");
fs.writeFileSync('src/components/molecules/JobCard.tsx', jobCard);

// Fix index.tsx
let index = fs.readFileSync('app/(tabs)/index.tsx', 'utf8');
index = index.replace(/onSelectOnMap=\{[^}]*\}/g, "");
// wait, the regex above will fail if onSelectOnMap spans multiple lines
index = index.replace(/onSelectOnMap=\{\(\) => \{[\s\S]*?\}\}/g, "");
fs.writeFileSync('app/(tabs)/index.tsx', index);
console.log("Fixed!");
