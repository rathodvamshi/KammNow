const fs = require('fs');

const files = [
  'app/(auth)/phone.tsx',
  'app/(auth)/signup.tsx',
  'app/(auth)/success.tsx',
  'app/(auth)/verify.tsx',
  'app/(tabs)/profile.tsx',
  'app/chat/[id].tsx',
  'app/job/[id].tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // We look for:
  //   );
  // }
  // 
  // const styles
  
  content = content.replace(/(\s+)(\);\s*\n\s*\})/g, "$1</View>\n$1$2");
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Fixed ${file}`);
});
