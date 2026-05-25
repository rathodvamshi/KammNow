const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./app');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // 1. Remove self-closing SafeAreaViews used as spacers
  content = content.replace(/<SafeAreaView\s+[^>]*\/>/g, '');

  // 2. Remove SafeAreaViews wrapping headers (e.g. app/job/post.tsx)
  content = content.replace(/<SafeAreaView\s+style=\{\{\s*backgroundColor:\s*Colors\.navy\s*\}\}\>/g, '');
  content = content.replace(/<\/SafeAreaView>/g, '');
  
  // 3. Remove wrapper SafeAreaViews using styles.screen or styles.safeArea
  content = content.replace(/<SafeAreaView\s+style=\{styles\.(?:screen|safeArea|safe|flex)\}>/g, '<View style={styles.screen}>');
  
  // Remove import of SafeAreaView from react-native or react-native-safe-area-context
  content = content.replace(/import\s+\{[^}]*SafeAreaView[^}]*\}\s+from\s+'react-native';/, match => {
    let newMatch = match.replace(/SafeAreaView,?/, '').trim();
    if (newMatch === "import {} from 'react-native';") return "";
    return newMatch;
  });
  content = content.replace(/import\s+\{[^}]*SafeAreaView[^}]*\}\s+from\s+'react-native-safe-area-context';/, match => {
    let newMatch = match.replace(/SafeAreaView,?/, '').trim();
    if (newMatch === "import {} from 'react-native-safe-area-context';") return "";
    return newMatch;
  });

  if (content !== originalContent) {
    // If the file uses TopBar, we know TopBar handles its own insets now.
    // If it has its own header, we need to inject padding.
    // Let's inject useSafeAreaInsets if it has a custom header.
    // E.g. job/post.tsx has <View style={styles.header}>
    if (content.includes('style={styles.header}')) {
      if (!content.includes('useSafeAreaInsets')) {
        content = content.replace(/import \{ View/, "import { View");
        content = "import { useSafeAreaInsets } from 'react-native-safe-area-context';\n" + content;
      }
      if (!content.includes('const insets = useSafeAreaInsets();')) {
        content = content.replace(/export default function[^{]+\{/, match => match + "\n  const insets = useSafeAreaInsets();");
      }
      content = content.replace(/<View style=\{styles\.header\}>/, '<View style={[styles.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}>');
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log(`Refactored: ${file}`);
  }
});
