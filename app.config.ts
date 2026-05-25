import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "KaamNow",
  slug: "kaamnow",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  scheme: "kaamnow",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#1A2340"
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.kaamnow.app",
    googleServicesFile: "./GoogleService-Info.plist",
    infoPlist: {
      NSLocationWhenInUseUsageDescription: "KaamNow needs your location to show nearby jobs.",
      "NSMicrophoneUsageDescription": "KaamNow needs mic access for voice job descriptions.",
      NSCameraUsageDescription: "KaamNow needs camera access to upload your profile photo.",
      NSPhotoLibraryUsageDescription: "KaamNow needs photo access to set your profile picture."
    },
    config: {
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAJ5-MlwgL-1JFdAmoQCELy6p7psnP7XWo"
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#1A2340"
    },
    package: "com.kaamnow.app",
    googleServicesFile: "./google-services.json",
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "RECORD_AUDIO",
      "CAMERA",
      "READ_EXTERNAL_STORAGE",
      "WRITE_EXTERNAL_STORAGE",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.ACCESS_FINE_LOCATION"
    ],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSyAJ5-MlwgL-1JFdAmoQCELy6p7psnP7XWo"
      }
    }
  },
  web: {
    favicon: "./assets/favicon.png",
    bundler: "metro"
  },
  plugins: [
    "expo-dev-client",
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "expo-router",
    "expo-font",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: "Allow KaamNow to use your location for nearby jobs."
      }
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/notification-icon.png",
        color: "#FF6B00"
      }
    ],
    "@react-native-community/datetimepicker"
  ],
  runtimeVersion: {
    policy: "appVersion"
  },
  experiments: {
    typedRoutes: true
  },
  extra: {
    router: {
      origin: false
    },
    eas: {
      projectId: "92058863-7ce7-48c7-a676-755ecff843b4"
    }
  },
  owner: "rathodvamshi"
});
