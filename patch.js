const fs = require('fs');
const path = '/Users/sainath.are/Documents/kammnow/src/components/organisms/LocationPromptBottomSheet.tsx';
let code = fs.readFileSync(path, 'utf8');

if (!code.includes('useLocationStore')) {
  code = code.replace(
    "import { useAddressStore } from '../../store/addressStore';",
    "import { useAddressStore } from '../../store/addressStore';\nimport { useLocationStore } from '../../store/locationStore';"
  );
}

if (!code.includes('updateLocation')) {
  code = code.replace(
    "const { savedAddresses, setActive } = useAddressStore();",
    "const { savedAddresses, setActive } = useAddressStore();\n  const { updateLocation } = useLocationStore();"
  );
}

const oldHandleSelect = `  const handleSelectSaved = (id: string) => {
    setActive(id);
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    // Setting active triggers re-render and closes via _layout effect if location exists
  };`;

const newHandleSelect = `  const handleSelectSaved = (id: string) => {
    setActive(id);
    const addr = savedAddresses.find((a) => a.id === id);
    if (addr) {
      updateLocation(addr.lat, addr.lng, addr.flatHouse || addr.area || 'Saved Location');
    }
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  };`;

if (code.includes(oldHandleSelect)) {
  code = code.replace(oldHandleSelect, newHandleSelect);
}

fs.writeFileSync(path, code);
console.log('Patched LocationPromptBottomSheet.tsx successfully.');
