export type DevicePlatform = 'ios' | 'android';
export type DeviceManufacturer = 'apple' | 'samsung' | 'google';
export type DeviceCategory = 'phone' | 'tablet';
export type DeviceCutout = 'island' | 'notch' | 'hole' | 'none';

export type DeviceProfile = {
    id: string;
    label: string;
    manufacturer: DeviceManufacturer;
    platform: DevicePlatform;
    category: DeviceCategory;
    width: number;
    height: number;
    cornerRadius: number;
    cutout: DeviceCutout;
    scale?: number;
    statusTop: number;
    statusInset: number;
    statusSize: number;
    notchWidth?: number;
    notchHeight?: number;
};

export type DeviceOrientation = 'portrait' | 'landscape';
export type ScreenOrientation = 'portrait-primary' | 'landscape-primary';

export type DeviceSurfaceProps = {
    orientation: DeviceOrientation;
    isLandscape: boolean;
    screen: {orientation: {type: ScreenOrientation; angle: 0 | 90}};
    device: DeviceProfile;
};
