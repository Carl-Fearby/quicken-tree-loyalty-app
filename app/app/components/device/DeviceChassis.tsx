import type {CSSProperties, ReactNode} from 'react';
import type {DeviceProfile} from './types';
import styles from './deviceChassis.module.css';

function chassisDepth(device: DeviceProfile) {
    if (device.category === 'tablet') return device.platform === 'ios' ? 17 : 15;
    return device.platform === 'ios' ? 26 : 24;
}

export function DeviceChassis({enabled, device, caseColor, className = '', style, children}: {
    enabled: boolean;
    device: DeviceProfile;
    caseColor?: string;
    className?: string;
    style?: CSSProperties;
    children: ReactNode;
}) {
    if (!enabled) return <>{children}</>;

    const depth = chassisDepth(device);
    const shellColor = caseColor ?? (device.platform === 'ios' ? 'var(--qt-color-141417)' : 'var(--qt-color-device-graphite)');
    const chassisStyle = {
        ...style,
        '--device-depth': `${depth}px`,
        '--case-color': shellColor,
        '--case-side': `color-mix(in srgb, ${shellColor} 86%, var(--qt-color-000000))`,
        '--case-shadow': `color-mix(in srgb, ${shellColor} 74%, var(--qt-color-000000))`
    } as CSSProperties;

    return <div className={[styles.chassisWrap, className].filter(Boolean).join(' ')} style={chassisStyle}>
        <div className="devicePivot">
            <div data-device-chassis="" className={styles.chassis}>
                <div className={styles.edgeBack} aria-hidden="true"/>
                <div className={styles.edgeRight} aria-hidden="true"/>
                <div className={styles.edgeLeft} aria-hidden="true"/>
                <div className={styles.edgeTop} aria-hidden="true"/>
                <div className={styles.edgeBottom} aria-hidden="true"/>
                <div className={styles.faceFront}>
                    <div className={styles.bodyShell}>{children}</div>
                </div>
            </div>
        </div>
    </div>;
}
