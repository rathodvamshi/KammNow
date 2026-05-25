const fs = require('fs');

// 1. Fix map-picker.tsx
let mapPicker = fs.readFileSync('app/location/map-picker.tsx', 'utf8');
if (!mapPicker.includes("import { useSafeAreaInsets }")) {
  mapPicker = "import { useSafeAreaInsets } from 'react-native-safe-area-context';\n" + mapPicker;
}
if (!mapPicker.includes("const insets = useSafeAreaInsets();")) {
  mapPicker = mapPicker.replace(/export default function MapPickerScreen\(\) \{/, "export default function MapPickerScreen() {\n  const insets = useSafeAreaInsets();");
}
fs.writeFileSync('app/location/map-picker.tsx', mapPicker);

// 2. Fix chat/[id].tsx and job/[id].tsx - wait, TS said "Cannot find name 'safeGoBack'".
// Let's check if the import exists. I will ensure it exists in both.
const ensureImport = (file) => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes("import { safeGoBack }")) {
    content = "import { safeGoBack } from '../../src/utils/navigation';\n" + content;
    fs.writeFileSync(file, content);
  }
};

ensureImport('app/chat/[id].tsx');
ensureImport('app/job/[id].tsx');

console.log("Fixed missing imports and variables");
