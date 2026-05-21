import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export const getPlatform = () => Capacitor.getPlatform();

export const isNativeIOSApp = () => isNativePlatform() && getPlatform() === 'ios';

export const isNativeAndroidApp = () => isNativePlatform() && getPlatform() === 'android';

export const isNativeStoreApp = () => isNativeIOSApp() || isNativeAndroidApp();

export const arePaidProductsEnabled = () => !isNativeAndroidApp();

export const FREE_PREMIUM_TRIAL_START = Date.parse('2026-05-01T00:00:00+09:00');
export const FREE_PREMIUM_TRIAL_END = Date.parse('2026-06-01T00:00:00+09:00');

export const isPremiumFreeTrialCampaignEnabled = (now = new Date()) => {
  const timestamp = now instanceof Date ? now.getTime() : Date.parse(now);
  return Number.isFinite(timestamp)
    && timestamp >= FREE_PREMIUM_TRIAL_START
    && timestamp < FREE_PREMIUM_TRIAL_END;
};

export const isFreePremiumAccessEnabled = () => isNativeAndroidApp();
