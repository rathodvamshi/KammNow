const fs = require('fs');
const files = [
  'app/profile/[id].tsx',
  'app/job/[id]/applications.tsx',
  'src/components/molecules/ReviewCard.tsx',
  'src/components/atoms/Avatar.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  
  // Remove Image from react-native import
  code = code.replace(/Image,\s*/g, '');
  code = code.replace(/,\s*Image/g, '');
  
  // Add expo-image import
  if (!code.includes("from 'expo-image'")) {
    code = code.replace("import {", "import { Image } from 'expo-image';\nimport {");
  }
  
  fs.writeFileSync(file, code);
  console.log(`Fixed Image in ${file}`);
});
