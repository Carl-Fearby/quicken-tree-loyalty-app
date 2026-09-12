import type {DeviceManufacturer, DeviceProfile} from './types';

export const deviceProfiles: DeviceProfile[] = [
    {id: 'iphone-se', label: 'iPhone SE', manufacturer: 'apple', platform: 'ios', category: 'phone', width: 375, height: 667, cornerRadius: 36, cutout: 'none', statusTop: 16, statusInset: 22, statusSize: 15},
    {id: 'iphone-14', label: 'iPhone 14', manufacturer: 'apple', platform: 'ios', category: 'phone', width: 390, height: 844, cornerRadius: 48, cutout: 'notch', statusTop: 16, statusInset: 24, statusSize: 14, notchWidth: 156, notchHeight: 30},
    {id: 'iphone-15', label: 'iPhone 15', manufacturer: 'apple', platform: 'ios', category: 'phone', width: 393, height: 852, cornerRadius: 48, cutout: 'island', statusTop: 20, statusInset: 28, statusSize: 16},
    {id: 'iphone-17-pro', label: 'iPhone 17 Pro', manufacturer: 'apple', platform: 'ios', category: 'phone', width: 402, height: 874, cornerRadius: 50, cutout: 'island', statusTop: 20, statusInset: 28, statusSize: 16},
    {id: 'iphone-16-plus', label: 'iPhone 16 Plus', manufacturer: 'apple', platform: 'ios', category: 'phone', width: 430, height: 932, cornerRadius: 50, cutout: 'island', statusTop: 20, statusInset: 28, statusSize: 16},
    {id: 'iphone-17-pro-max', label: 'iPhone 17 Pro Max', manufacturer: 'apple', platform: 'ios', category: 'phone', width: 440, height: 956, cornerRadius: 54, cutout: 'island', statusTop: 21, statusInset: 30, statusSize: 16},
    {id: 'ipad-mini-a17', label: 'iPad mini', manufacturer: 'apple', platform: 'ios', category: 'tablet', width: 744, height: 1133, cornerRadius: 28, cutout: 'none', statusTop: 20, statusInset: 34, statusSize: 15},
    {id: 'ipad-pro-11-m5', label: 'iPad Pro 11″', manufacturer: 'apple', platform: 'ios', category: 'tablet', width: 834, height: 1210, cornerRadius: 28, cutout: 'none', statusTop: 22, statusInset: 36, statusSize: 16},
    {id: 'ipad-pro-13-m4', label: 'iPad Pro 13″', manufacturer: 'apple', platform: 'ios', category: 'tablet', width: 1032, height: 1376, cornerRadius: 28, cutout: 'none', statusTop: 22, statusInset: 36, statusSize: 16},
    {id: 'galaxy-s24', label: 'Galaxy S24', manufacturer: 'samsung', platform: 'android', category: 'phone', width: 360, height: 780, cornerRadius: 40, cutout: 'hole', statusTop: 10, statusInset: 24, statusSize: 13},
    {id: 'galaxy-s24-plus', label: 'Galaxy S24+', manufacturer: 'samsung', platform: 'android', category: 'phone', width: 384, height: 854, cornerRadius: 42, cutout: 'hole', statusTop: 10, statusInset: 26, statusSize: 13},
    {id: 'galaxy-s24-ultra', label: 'Galaxy S24 Ultra', manufacturer: 'samsung', platform: 'android', category: 'phone', width: 384, height: 824, cornerRadius: 42, cutout: 'hole', statusTop: 10, statusInset: 26, statusSize: 13},
    {id: 'galaxy-a55', label: 'Galaxy A55', manufacturer: 'samsung', platform: 'android', category: 'phone', width: 360, height: 800, cornerRadius: 38, cutout: 'hole', statusTop: 10, statusInset: 24, statusSize: 13},
    {id: 'galaxy-tab-s9', label: 'Galaxy Tab S9', manufacturer: 'samsung', platform: 'android', category: 'tablet', width: 800, height: 1280, cornerRadius: 20, cutout: 'none', statusTop: 14, statusInset: 36, statusSize: 16},
    {id: 'galaxy-tab-s9-ultra', label: 'Galaxy Tab S9 Ultra', manufacturer: 'samsung', platform: 'android', category: 'tablet', width: 924, height: 1480, cornerRadius: 18, cutout: 'none', statusTop: 14, statusInset: 40, statusSize: 16},
    {id: 'pixel-8a', label: 'Pixel 8a', manufacturer: 'google', platform: 'android', category: 'phone', width: 393, height: 873, cornerRadius: 40, cutout: 'hole', statusTop: 10, statusInset: 24, statusSize: 13},
    {id: 'pixel-9', label: 'Pixel 9', manufacturer: 'google', platform: 'android', category: 'phone', width: 412, height: 923, cornerRadius: 42, cutout: 'hole', statusTop: 10, statusInset: 24, statusSize: 13},
    {id: 'pixel-9-pro', label: 'Pixel 9 Pro', manufacturer: 'google', platform: 'android', category: 'phone', width: 410, height: 914, cornerRadius: 42, cutout: 'hole', statusTop: 10, statusInset: 24, statusSize: 13},
    {id: 'pixel-9-pro-xl', label: 'Pixel 9 Pro XL', manufacturer: 'google', platform: 'android', category: 'phone', width: 448, height: 997, cornerRadius: 44, cutout: 'hole', statusTop: 10, statusInset: 26, statusSize: 13},
    {id: 'pixel-tablet', label: 'Pixel Tablet', manufacturer: 'google', platform: 'android', category: 'tablet', width: 800, height: 1280, cornerRadius: 22, cutout: 'none', statusTop: 14, statusInset: 36, statusSize: 16}
];

export const defaultManufacturerId: DeviceManufacturer = 'apple';
export const defaultDeviceId = 'iphone-17-pro-max';

export const manufacturers = [
    {id: 'apple' as const, label: 'Apple'},
    {id: 'samsung' as const, label: 'Samsung'},
    {id: 'google' as const, label: 'Google'}
];

const newestFirst = [
    'iphone-17-pro-max', 'iphone-17-pro', 'ipad-pro-11-m5', 'iphone-16-plus', 'ipad-mini-a17', 'ipad-pro-13-m4', 'iphone-15', 'iphone-14', 'iphone-se',
    'galaxy-s24-ultra', 'galaxy-s24-plus', 'galaxy-s24', 'galaxy-a55', 'galaxy-tab-s9-ultra', 'galaxy-tab-s9',
    'pixel-9-pro-xl', 'pixel-9-pro', 'pixel-9', 'pixel-8a', 'pixel-tablet'
];
const modelRecency = new Map(newestFirst.map((id, index) => [id, index]));

export function getModelsForManufacturer(manufacturer: DeviceManufacturer) {
    return deviceProfiles
        .filter(profile => profile.manufacturer === manufacturer)
        .sort((a, b) => (modelRecency.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (modelRecency.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

export function getDefaultModelForManufacturer(manufacturer: DeviceManufacturer) {
    if (manufacturer === 'apple') return deviceProfiles.find(profile => profile.id === defaultDeviceId) ?? getModelsForManufacturer(manufacturer)[0];
    return getModelsForManufacturer(manufacturer)[0];
}
