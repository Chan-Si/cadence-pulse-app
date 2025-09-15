import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.2b7cde7c4e554e1390f250e853afd465',
  appName: 'Cadence',
  webDir: 'dist',
  server: {
    url: 'https://2b7cde7c-4e55-4e13-90f2-50e853afd465.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#7c3aed',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#ffffff'
    }
  }
};

export default config;