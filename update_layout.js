const fs = require('fs');

let layout = fs.readFileSync('app/_layout.tsx', 'utf8');

if (!layout.includes('ErrorBoundary')) {
  layout = layout.replace("import { StatusBar } from 'expo-status-bar';", "import { StatusBar } from 'expo-status-bar';\nimport { ErrorBoundary } from '../src/components/ErrorBoundary/ErrorBoundary';");
  layout = layout.replace("<GestureHandlerRootView style={{ flex: 1 }}>", "<ErrorBoundary>\n    <GestureHandlerRootView style={{ flex: 1 }}>");
  layout = layout.replace("</GestureHandlerRootView>", "</GestureHandlerRootView>\n    </ErrorBoundary>");
}

fs.writeFileSync('app/_layout.tsx', layout);
console.log("Updated _layout.tsx");
