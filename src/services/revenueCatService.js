import { safeStorage } from '@/lib/safeStorage';
import { arePaidProductsEnabled, getPlatform, isNativeStoreApp } from '@/lib/runtimePlatform';
import { setPremiumStatus } from '@/services/authService';

const REVENUECAT_USER_KEY = 'finapple_revenuecat_user_id';
const REVENUECAT_APPLE_API_KEY = import.meta.env.VITE_REVENUECAT_APPLE_API_KEY || '';
const REVENUECAT_GOOGLE_API_KEY = import.meta.env.VITE_REVENUECAT_GOOGLE_API_KEY || '';
const REVENUECAT_ENTITLEMENT_ID = import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID || 'premium';
const REVENUECAT_OFFERING_ID = import.meta.env.VITE_REVENUECAT_OFFERING_ID || '';
const REVENUECAT_SURVIVAL_COIN_OFFERING_ID = import.meta.env.VITE_REVENUECAT_SURVIVAL_COIN_OFFERING_ID || '';
const REVENUECAT_SURVIVAL_COIN_PACKAGE_ID = import.meta.env.VITE_REVENUECAT_SURVIVAL_COIN_PACKAGE_ID || '';

let isConfigured = false;
let activeAppUserId = null;
let customerInfoListenerId = null;
const REVENUECAT_MODULE_NAME = '@revenuecat/purchases-capacitor';

const loadRevenueCat = async () => {
  if (!canUseRevenueCat()) {
    throw new Error('스토어 인앱결제 설정이 아직 완료되지 않았습니다.');
  }

  // Keep RevenueCat out of the Android free-launch bundle. Re-enable the static
  // native import when paid store products come back.
  return import(/* @vite-ignore */ REVENUECAT_MODULE_NAME);
};

const getRevenueCatApiKey = () => {
  const platform = getPlatform();
  if (platform === 'android') {
    return REVENUECAT_GOOGLE_API_KEY;
  }

  if (platform === 'ios') {
    return REVENUECAT_APPLE_API_KEY;
  }

  return '';
};

const hasRevenueCatConfig = () => Boolean(getRevenueCatApiKey());

export const canUseRevenueCat = () => arePaidProductsEnabled() && isNativeStoreApp() && hasRevenueCatConfig();

export const getRevenueCatStoreLabel = () => (getPlatform() === 'android' ? 'Google Play' : 'App Store');

export const getRevenueCatEntitlementId = () => REVENUECAT_ENTITLEMENT_ID;

const getStoredAppUserId = () => safeStorage.getItem(REVENUECAT_USER_KEY);

const setStoredAppUserId = (value) => {
  if (value) {
    safeStorage.setItem(REVENUECAT_USER_KEY, value);
    return;
  }

  safeStorage.removeItem(REVENUECAT_USER_KEY);
};

export const hasActivePremiumEntitlement = (customerInfo) => {
  const activeEntitlements = customerInfo?.entitlements?.active || {};

  if (REVENUECAT_ENTITLEMENT_ID && activeEntitlements[REVENUECAT_ENTITLEMENT_ID]?.isActive) {
    return true;
  }

  return Object.values(activeEntitlements).some((entitlement) => entitlement?.isActive);
};

const syncPremiumFlagIfNeeded = async (user, customerInfo) => {
  if (!user?.id) {
    return customerInfo;
  }

  const hasPremium = hasActivePremiumEntitlement(customerInfo);
  const currentFlag = Boolean(user?.user_metadata?.is_premium ?? user?.is_premium ?? false);

  if (currentFlag !== hasPremium) {
    await setPremiumStatus(hasPremium);
  }

  return customerInfo;
};

const attachCustomerInfoListener = async (user) => {
  if (customerInfoListenerId || !canUseRevenueCat()) {
    return;
  }

  const { Purchases } = await loadRevenueCat();
  customerInfoListenerId = await Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
    try {
      await syncPremiumFlagIfNeeded(user, customerInfo);
    } catch (error) {
      console.error('RevenueCat customer info sync failed:', error);
    }
  });
};

export const initializeRevenueCatForUser = async (user) => {
  if (!canUseRevenueCat() || !user?.id) {
    return null;
  }

  const appUserID = user.id;

  const { LOG_LEVEL, Purchases } = await loadRevenueCat();

  if (!isConfigured) {
    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }

    await Purchases.configure({
      apiKey: getRevenueCatApiKey(),
      appUserID,
    });
    isConfigured = true;
    activeAppUserId = appUserID;
    setStoredAppUserId(appUserID);
    await attachCustomerInfoListener(user);
    return syncRevenueCatPremiumStatus(user);
  }

  if (activeAppUserId !== appUserID) {
    await Purchases.logIn({ appUserID });
    activeAppUserId = appUserID;
    setStoredAppUserId(appUserID);
  }

  await attachCustomerInfoListener(user);
  return syncRevenueCatPremiumStatus(user);
};

export const syncRevenueCatPremiumStatus = async (user) => {
  if (!canUseRevenueCat() || !user?.id) {
    return null;
  }

  const { Purchases } = await loadRevenueCat();
  const { customerInfo } = await Purchases.getCustomerInfo();
  await syncPremiumFlagIfNeeded(user, customerInfo);
  return customerInfo;
};

const getRevenueCatOfferingPackage = async ({ user, offeringId, fallbackToCurrent = false, packageFilter } = {}) => {
  if (!canUseRevenueCat()) {
    return null;
  }

  if (user?.id) {
    await initializeRevenueCatForUser(user);
  }

  const { Purchases } = await loadRevenueCat();
  const offerings = await Purchases.getOfferings();
  const offering = (offeringId && offerings.all?.[offeringId]) || (fallbackToCurrent ? offerings.current : null);

  if (!offering) {
    return null;
  }

  const availablePackages = offering.availablePackages || [];
  const selectedPackage = typeof packageFilter === 'function'
    ? availablePackages.find(packageFilter) || null
    : availablePackages[0] || null;

  return {
    offering,
    selectedPackage,
    availablePackages,
  };
};

export const getRevenueCatPaywall = async (user) => {
  const paywall = await getRevenueCatOfferingPackage({
    user,
    offeringId: REVENUECAT_OFFERING_ID,
    fallbackToCurrent: true,
  });

  if (!paywall) {
    return null;
  }

  const monthlyPackage = paywall.availablePackages?.find((pkg) => pkg?.packageType === 'MONTHLY') || null;
  const annualPackage = paywall.availablePackages?.find((pkg) => pkg?.packageType === 'ANNUAL') || null;

  return {
    offering: paywall.offering,
    selectedPackage: monthlyPackage || annualPackage || paywall.selectedPackage || paywall.availablePackages?.[0] || null,
    monthlyPackage,
    annualPackage,
    availablePackages: paywall.availablePackages || [],
  };
};

export const getRevenueCatSurvivalCoinPack = async (user) => {
  const paywall = await getRevenueCatOfferingPackage({
    user,
    offeringId: REVENUECAT_SURVIVAL_COIN_OFFERING_ID,
    fallbackToCurrent: false,
    packageFilter: (pkg) => {
      if (!REVENUECAT_SURVIVAL_COIN_PACKAGE_ID) {
        return true;
      }

      return pkg?.identifier === REVENUECAT_SURVIVAL_COIN_PACKAGE_ID;
    },
  });

  if (!paywall) {
    return null;
  }

  return {
    offering: paywall.offering,
    selectedPackage: paywall.selectedPackage || paywall.availablePackages?.[0] || null,
  };
};

export const purchaseRevenueCatPackage = async ({ user, aPackage }) => {
  if (!canUseRevenueCat()) {
    throw new Error('스토어 인앱 구독 설정이 아직 완료되지 않았습니다.');
  }

  if (!aPackage) {
    throw new Error('구매 가능한 구독 상품을 찾지 못했습니다.');
  }

  await initializeRevenueCatForUser(user);
  const { Purchases } = await loadRevenueCat();
  const result = await Purchases.purchasePackage({ aPackage });
  await syncPremiumFlagIfNeeded(user, result.customerInfo);
  return result.customerInfo;
};

export const purchaseRevenueCatSurvivalCoinPack = async ({ user, aPackage }) => {
  if (!canUseRevenueCat()) {
    throw new Error('스토어 인앱결제 설정이 아직 완료되지 않았습니다.');
  }

  if (!aPackage) {
    throw new Error('구매 가능한 코인팩 상품을 찾지 못했습니다. Google Play Console/App Store Connect와 RevenueCat 상품을 연결해주세요.');
  }

  await initializeRevenueCatForUser(user);
  const { Purchases } = await loadRevenueCat();
  const result = await Purchases.purchasePackage({ aPackage });
  return result;
};

export const restoreRevenueCatPurchases = async (user) => {
  if (!canUseRevenueCat()) {
    throw new Error('스토어 인앱 구독 설정이 아직 완료되지 않았습니다.');
  }

  await initializeRevenueCatForUser(user);
  const { Purchases } = await loadRevenueCat();
  const { customerInfo } = await Purchases.restorePurchases();
  await syncPremiumFlagIfNeeded(user, customerInfo);
  return customerInfo;
};

export const resetRevenueCatSession = async () => {
  if (!isConfigured || !canUseRevenueCat()) {
    activeAppUserId = null;
    setStoredAppUserId(null);
    return;
  }

  const storedUserId = getStoredAppUserId();
  if (storedUserId || activeAppUserId) {
    try {
      const { Purchases } = await loadRevenueCat();
      await Purchases.logOut();
    } catch (error) {
      console.error('RevenueCat logout failed:', error);
    }
  }

  activeAppUserId = null;
  setStoredAppUserId(null);
};
