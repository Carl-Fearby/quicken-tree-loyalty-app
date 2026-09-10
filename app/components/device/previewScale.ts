import type {DeviceProfile} from './types';

const PREVIEW_FIT = 0.96;

export function computePreviewScale(areaWidth: number, areaHeight: number, device: DeviceProfile, isLandscape: boolean) {
    if (areaWidth <= 0 || areaHeight <= 0) return 1;
    const layoutWidth = isLandscape ? device.height : device.width;
    const layoutHeight = isLandscape ? device.width : device.height;
    return Math.min(areaWidth / layoutWidth, areaHeight / layoutHeight) * PREVIEW_FIT;
}
