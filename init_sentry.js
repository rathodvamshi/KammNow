const fs = require('fs');

let layout = fs.readFileSync('app/_layout.tsx', 'utf8');

if (!layout.includes('Sentry.init')) {
  layout = layout.replace("import * as SplashScreen from 'expo-splash-screen';", "import * as SplashScreen from 'expo-splash-screen';\nimport * as Sentry from '@sentry/react-native';");
  
  const sentryInit = `
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 1.0,
});
`;
  layout = layout.replace("SplashScreen.preventAutoHideAsync();", `SplashScreen.preventAutoHideAsync();\n${sentryInit}`);
}

fs.writeFileSync('app/_layout.tsx', layout);
console.log("Initialized Sentry");
