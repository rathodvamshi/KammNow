const fs = require('fs');

const files = [
  'app/chat/[id].tsx',
  'app/job/[id].tsx',
  'app/(tabs)/profile.tsx',
  'app/(auth)/signup.tsx',
  'app/(auth)/success.tsx',
  'app/(auth)/verify.tsx',
  'app/(auth)/phone.tsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  if (content.includes('router.back()') || content.includes('router.canGoBack()')) {
    content = content.replace(/router\.back\(\)/g, 'safeGoBack()');
    content = content.replace(/if\s*\(\s*router\.canGoBack\(\)\s*\)\s*\{\s*safeGoBack\(\);\s*\}\s*else\s*\{\s*router\.push\([^)]+\);\s*\}/g, 'safeGoBack()');
    content = content.replace(/if\s*\(!router\.canGoBack\(\)\)\s*return;/g, '');
    
    if (!content.includes('safeGoBack')) {
      const match = content.match(/import\s+.*from\s+['"]expo-router['"];/);
      if (match) {
        content = content.substring(0, match.index) + "import { safeGoBack } from '../../src/utils/navigation';\n" + content.substring(match.index);
      } else {
        content = "import { safeGoBack } from '../../src/utils/navigation';\n" + content;
      }
    }
    changed = true;
  }
  
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Navigation fixed: ${file}`);
  }
});
