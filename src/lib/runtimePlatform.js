import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export const getPlatform = () => Capacitor.getPlatform();

export const isNativeIOSApp = () => isNativePlatform() && getPlatform() === 'ios';

export const isNativeAndroidApp = () => isNativePlatform() && getPlatform() === 'android';

export const isNativeStoreApp = () => isNativeIOSApp() || isNativeAndroidApp();

export const arePaidProductsEnabled = () => !isNativeAndroidApp();

export const isFreePremiumAccessEnabled = () => isNativeAndroidApp();
