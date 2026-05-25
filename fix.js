const fs = require('fs');
let text = fs.readFileSync('app/(tabs)/index.tsx', 'utf8');
const startTag = '<LocationPromptBottomSheet';
const endTag = 'hasSavedAddresses={savedAddresses.length > 0}\n      />';
const startIdx = text.indexOf(startTag, 1000); // skip imports
const endIdx = text.indexOf(endTag, startIdx);
if (startIdx !== -1 && endIdx !== -1) {
  const toReplace = text.substring(startIdx, endIdx + endTag.length);
  const replacement = `<LocationPromptBottomSheet
        mode={promptSheetMode}
        visible={showPromptSheet}
        onClose={() => setShowPromptSheet(false)}
        onEnableLocation={async () => {
          if (promptSheetMode === 'gps_off') {
            if (Platform.OS === 'web') {
              alert('Please turn on location access in your browser settings.');
              await checkLocationLifecycle();
            } else {
              Linking.openSettings();
            }
          } else {
            try {
              const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
              if (status === 'granted') {
                useLocationStore.getState().setPermission(true);
                const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
                const geo = await reverseGeocode(loc.coords.latitude, loc.coords.longitude);
                useLocationStore.getState().updateLocation(
                  loc.coords.latitude,
                  loc.coords.longitude,
                  geo.formattedLine2 || geo.area || geo.city || 'Current Location'
                );
                setShowPromptSheet(false);
              }
            } catch (e) {
              Sentry.captureMessage('Enable from prompt failed: ' + e);
            }
          }
        }}
      />`;
  text = text.replace(toReplace, replacement);
  fs.writeFileSync('app/(tabs)/index.tsx', text);
  console.log('Fixed index.tsx');
} else {
  console.log('Could not find tags');
}
