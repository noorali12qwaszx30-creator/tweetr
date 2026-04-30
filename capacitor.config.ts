import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ffbc149befc04553bf78cf970abd94af',
  appName: 'tweetr',
  webDir: 'dist',
  server: {
    url: 'https://ffbc149b-efc0-4553-bf78-cf970abd94af.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#F97316',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
    StatusBar: {
      backgroundColor: '#F97316',
      style: 'DARK',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#F97316',
      sound: 'default',
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;