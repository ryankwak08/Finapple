import { Capacitor } from '@capacitor/core';

export const isNativePlatform = () => Capacitor.isNativePlatform();

export const getPlatform = () => Capacitor.getPlatform();

export const isNativeIOSApp = () => isNativePlatform() && getPlatform() === 'ios';
