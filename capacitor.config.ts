import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.ffbc149befc04553bf78cf970abd94af',
  appName: 'tweetr',
  webDir: 'dist',
  server: {
    url: 'https://tweetr.lovable.app',
    cleartext: false,
    androidScheme: 'https',
    errorPath: 'offline.html',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#F2602A',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
    StatusBar: {
      backgroundColor: '#F2602A',
      style: 'DARK',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#F2602A',
      sound: 'default',
    },
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;