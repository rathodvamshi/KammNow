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
  
  content = content.replace(/<SafeAreaView/g, '<View');
  content = content.replace(/<\/SafeAreaView>/g, '<\/View>');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Replaced SafeAreaView in ${file}`);
});
