const fs = require('fs');
const path = require('path');

const targetFiles = [
  'src/components/organisms/TopBar.tsx',
  'app/notifications.tsx',
  'app/profile/[id].tsx',
  'app/search.tsx',
  'app/job/[id].tsx',
  'app/job/[id]/applications.tsx',
  'app/job/post.tsx',
  'app/job/edit/[id].tsx',
  'app/chat/[id].tsx',
  'app/rating/[applicationId].tsx',
  'app/location/saved-addresses.tsx',
  'app/location/address-form.tsx',
  'app/location/map-picker.tsx'
];

function processFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes('router.back()') && !content.includes('safeGoBack()')) {
    // Determine relative path to src/utils/navigation
    const dirCount = filePath.split('/').length - 1;
    let relPath = '../'.repeat(dirCount) + 'src/utils/navigation';
    if (filePath.startsWith('src/')) {
        relPath = '../'.repeat(dirCount) + 'utils/navigation';
    }
    
    // Add import
    const importStatement = `import { safeGoBack } from '${relPath}';\n`;
    // Insert after expo-router import or at top
    if (content.includes("import { router } from 'expo-router';")) {
      content = content.replace("import { router } from 'expo-router';", `import { router } from 'expo-router';\n${importStatement}`);
    } else if (content.includes("import { router, Stack } from 'expo-router';")) {
      content = content.replace("import { router, Stack } from 'expo-router';", `import { router, Stack } from 'expo-router';\n${importStatement}`);
    } else {
      content = importStatement + content;
    }
    
    // Replace all router.back()
    content = content.replace(/router\.back\(\)/g, 'safeGoBack()');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${filePath}`);
  }
}

targetFiles.forEach(processFile);
