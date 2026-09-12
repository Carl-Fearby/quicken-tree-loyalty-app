import type {DeviceProfile} from './types';

const PREVIEW_FIT = 0.96;

export function computePreviewScale(areaWidth: number, areaHeight: number, device: DeviceProfile, isLandscape: boolean) {
    if (areaWidth <= 0 || areaHeight <= 0) return 1;
    // Rotation changes the device bounds, not the perceived device size. Fit the
    // portrait chassis once so toggling orientation does not rescale the preview.
    void isLandscape;
    return Math.min(areaWidth / device.width, areaHeight / device.height) * PREVIEW_FIT;
}
