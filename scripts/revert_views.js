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
  
  // Revert the wrong replacement
  content = content.replace(/<\/View>\n(\s+)(\);\s*\n\s*\})/g, "$1$2");
  
  // Now add </View> precisely at the end of the main component return.
  // We can do this by finding:
  //   );
  // }
  //
  // const styles = StyleSheet.create({
  
  content = content.replace(/(\s+)(\);\s*\n\}\s*\n\s*const styles = StyleSheet\.create)/g, "$1</View>\n$1$2");
  
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Reverted and Fixed ${file}`);
});
