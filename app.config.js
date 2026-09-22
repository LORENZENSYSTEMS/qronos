const appConfig = require('./app.json');

if (process.env.EXPO_PUBLIC_GOOGLE_MAPS) {
  if (!appConfig.expo.android) appConfig.expo.android = {};
  if (!appConfig.expo.android.config) appConfig.expo.android.config = {};
  appConfig.expo.android.config.googleMaps = {
    apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS
  };
}

module.exports = appConfig;