const fs = require('fs');
const files = [
  'app/(auth)/verify.tsx',
  'app/(auth)/signup.tsx'
];

files.forEach(file => {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('KeyboardAwareScrollView')) return;
  
  // Replace imports
  code = code.replace("import {", "import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';\nimport {");
  
  // Replace <KeyboardAvoidingView
  code = code.replace(
    /<KeyboardAvoidingView[\s\S]*?>[\s\S]*?<ScrollView/g,
    `<KeyboardAwareScrollView\n      style={styles.flex}\n      contentContainerStyle={styles.scrollContent}\n      keyboardShouldPersistTaps="handled"\n      showsVerticalScrollIndicator={false}\n      enableOnAndroid={true}\n      extraScrollHeight={20}\n    >`
  );
  
  // Replace end tags
  code = code.replace(/<\/ScrollView>\s*<\/SafeAreaView>\s*<\/KeyboardAvoidingView>/g, '</KeyboardAwareScrollView>\n    </SafeAreaView>');
  
  fs.writeFileSync(file, code);
  console.log(`Updated ${file}`);
});
