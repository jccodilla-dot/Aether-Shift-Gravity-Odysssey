import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jmclabs.aethershift',
  appName: "Arya's Infinite Odyssey",
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#070B19',
  },
};

export default config;
