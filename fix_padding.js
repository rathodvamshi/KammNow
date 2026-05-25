const fs = require('fs');
let code = fs.readFileSync('app/(tabs)/index.tsx', 'utf8');
code = code.replace('<View style={{ paddingHorizontal: 16 }}>', '<View>');
fs.writeFileSync('app/(tabs)/index.tsx', code);
console.log("Fixed padding!");
