import type {DeviceProfile} from './types';

const PREVIEW_FIT = 0.96;

export function computePreviewScale(areaWidth: number, areaHeight: number, device: DeviceProfile, isLandscape: boolean) {
    if (areaWidth <= 0 || areaHeight <= 0) return 1;
    // Keep the same perceived chassis size when rotating. In landscape, only a
    // narrow preview area may reduce that portrait-derived scale.
    const portraitScale = Math.min(areaWidth / device.width, areaHeight / device.height) * PREVIEW_FIT;
    if (!isLandscape) return portraitScale;

    const landscapeWidthScale = (areaWidth / device.height) * PREVIEW_FIT;
    return Math.min(portraitScale, landscapeWidthScale);
}
