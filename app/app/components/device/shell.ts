import type {CSSProperties} from 'react';
import type {DeviceProfile} from './types';

export function buildDeviceStyle(device: DeviceProfile, extra?: CSSProperties): CSSProperties {
    const bezel = device.platform === 'ios' ? 10 : 8;
    const innerRadius = Math.max(device.cornerRadius - bezel, 0);
    return {
        '--device-width': `${device.width}px`,
        '--device-height': `${device.height}px`,
        '--device-radius': `${device.cornerRadius}px`,
        '--device-inner-radius': `${innerRadius}px`,
        '--device-bezel': `${bezel}px`,
        '--preview-scale': device.scale ?? 1,
        '--landscape-home-top': `${(device.height - 202) / 2}px`,
        '--status-top': `${device.statusTop}px`,
        '--status-inset': `${device.statusInset}px`,
        '--status-size': `${device.statusSize}px`,
        '--notch-width': `${device.notchWidth ?? 154}px`,
        '--notch-height': `${device.notchHeight ?? 31}px`,
        width: device.width,
        height: device.height,
        ...extra
    } as CSSProperties;
}
