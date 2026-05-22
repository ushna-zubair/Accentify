export default {
    expo: {
        name: "Accentify",
        slug: "Accentify",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        newArchEnabled: true,
        splash: {
            image: "./assets/logo.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff"
        },
        ios: {
            supportsTablet: true
        },
        android: {
            package: "com.accentify.app",
            adaptiveIcon: {
                foregroundImage: "./assets/adaptive-icon.png",
                backgroundColor: "#ffffff"
            },
            edgeToEdgeEnabled: true,
            predictiveBackGestureEnabled: false
        },
        web: {
            favicon: "./assets/favicon.png"
        },
        plugins: [
            "expo-secure-store",
            "expo-font",
            "expo-apple-authentication",
            "expo-audio",
            "expo-web-browser"
        ],
        extra: {
            FIREBASE_API_KEY: process.env.FIREBASE_API_KEY,
            FIREBASE_AUTH_DOMAIN: process.env.FIREBASE_AUTH_DOMAIN,
            FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
            FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
            FIREBASE_MESSAGING_SENDER_ID: process.env.FIREBASE_MESSAGING_SENDER_ID,
            FIREBASE_APP_ID: process.env.FIREBASE_APP_ID,
            FIREBASE_MEASUREMENT_ID: process.env.FIREBASE_MEASUREMENT_ID,
            // Accentify pronunciation + feedback model service (HF Space / Render / Fly etc).
            // Override per-environment via `EXPO_PUBLIC_ACCENTIFY_API_URL`.
            ACCENTIFY_API_URL: process.env.EXPO_PUBLIC_ACCENTIFY_API_URL || process.env.ACCENTIFY_API_URL,
            ACCENTIFY_API_TOKEN: process.env.EXPO_PUBLIC_ACCENTIFY_API_TOKEN || process.env.ACCENTIFY_API_TOKEN,
            // Accentify conversation service (separate HF Space — different model + different token).
            // Hosts /conversation/text (Wavy Chat) and /conversation/audio (Tutor voice chat).
            ACCENTIFY_CONVO_API_URL:
                process.env.EXPO_PUBLIC_ACCENTIFY_CONVO_API_URL ||
                process.env.ACCENTIFY_CONVO_API_URL ||
                "https://ahmad7080-accentify-audio-conversation.hf.space",
            ACCENTIFY_CONVO_API_TOKEN:
                process.env.EXPO_PUBLIC_ACCENTIFY_CONVO_API_TOKEN ||
                process.env.ACCENTIFY_CONVO_API_TOKEN,
            // Google Sign-In: get this from Firebase Console → Authentication → Sign-in method → Google → Web client ID
            googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_WEB_CLIENT_ID,
            eas: {
                projectId: "888767b5-bc51-4eae-a5dd-e62a25fceab2" // Optional: if you use EAS
            }
        }
    }
};
