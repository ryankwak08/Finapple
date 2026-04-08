import { LOG_LEVEL, Purchases } from '@revenuecat/purchases-capacitor';
import { safeStorage } from '@/lib/safeStorage';
import { isNativeIOSApp } from '@/lib/runtimePlatform';
import { setPremiumStatus } from '@/services/authService';

const REVENUECAT_USER_KEY = 'finapple_revenuecat_user_id';
const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_APPLE_API_KEY || '';
const REVENUECAT_ENTITLEMENT_ID = import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID || 'premium';
const REVENUECAT_OFFERING_ID = import.meta.env.VITE_REVENUECAT_OFFERING_ID || '';

let isConfigured = false;
let activeAppUserId = null;
let customerInfoListenerId = null;

const hasRevenueCatConfig = () => Boolean(REVENUECAT_API_KEY);

export const canUseRevenueCat = () => isNativeIOSApp() && hasRevenueCatConfig();

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

  if (!isConfigured) {
    if (import.meta.env.DEV) {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    }

    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
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

  const { customerInfo } = await Purchases.getCustomerInfo();
  await syncPremiumFlagIfNeeded(user, customerInfo);
  return customerInfo;
};

export const getRevenueCatPaywall = async (user) => {
  if (!canUseRevenueCat()) {
    return null;
  }

  if (user?.id) {
    await initializeRevenueCatForUser(user);
  }

  const offerings = await Purchases.getOfferings();
  const offering = (REVENUECAT_OFFERING_ID && offerings.all?.[REVENUECAT_OFFERING_ID]) || offerings.current;

  if (!offering) {
    return null;
  }

  const selectedPackage = offering.monthly || offering.availablePackages?.[0] || null;

  return {
    offering,
    selectedPackage,
  };
};

export const purchaseRevenueCatPackage = async ({ user, aPackage }) => {
  if (!canUseRevenueCat()) {
    throw new Error('iOS 인앱 구독 설정이 아직 완료되지 않았습니다.');
  }

  if (!aPackage) {
    throw new Error('구매 가능한 구독 상품을 찾지 못했습니다.');
  }

  await initializeRevenueCatForUser(user);
  const result = await Purchases.purchasePackage({ aPackage });
  await syncPremiumFlagIfNeeded(user, result.customerInfo);
  return result.customerInfo;
};

export const restoreRevenueCatPurchases = async (user) => {
  if (!canUseRevenueCat()) {
    throw new Error('iOS 인앱 구독 설정이 아직 완료되지 않았습니다.');
  }

  await initializeRevenueCatForUser(user);
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
      await Purchases.logOut();
    } catch (error) {
      console.error('RevenueCat logout failed:', error);
    }
  }

  activeAppUserId = null;
  setStoredAppUserId(null);
};
