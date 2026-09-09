'use client';

import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {Icon} from '../Icon';
import styles from './styles.module.css';

export type IphoneOrientation = 'portrait' | 'landscape';
export type IphoneScreenOrientation = 'portrait-primary' | 'landscape-primary';
export type DeviceProfile = { id: string; label: string; width: number; height: number; cornerRadius: number; cutout: 'island' | 'notch' | 'none'; scale?: number; statusTop: number; statusInset: number; statusSize: number; notchWidth?: number; notchHeight?: number };
export type IphoneSurfaceProps = {
    orientation: IphoneOrientation;
    isLandscape: boolean;
    screen: {orientation: {type: IphoneScreenOrientation; angle: 0 | 90}};
    device: DeviceProfile;
};
export type IphoneApp = { id: string; label: string; icon: ReactNode; app: ReactNode | ((props: IphoneSurfaceProps) => ReactNode) };
export type IphoneNotification = { context: string; title: string; body: string };

type LaunchOrigin = { x: number; y: number; width: number; height: number; scaleX: number; scaleY: number };

const systemApps = [
    ['fa-calendar-days', 'Calendar'], ['fa-image', 'Photos'], ['fa-music', 'Music'], ['fa-map-location-dot', 'Maps'],
    ['fa-cloud-sun', 'Weather'], ['fa-note-sticky', 'Notes']
] as const;

const formatCurrentTime = () => new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit', hourCycle: 'h23'}).format(new Date());
export const DISMISS_MS = 380;

export function IphoneContainer({apps, dockApps = [], initialAppId = null, notification = null, onDismissNotification, onClock = () => undefined, isDark = false, isLandscape = false, device = {id: 'iphone-15', label: 'iPhone 15', width: 393, height: 852, cornerRadius: 48, cutout: 'island', statusTop: 20, statusInset: 28, statusSize: 16}, className = ''}: {
    apps: IphoneApp[];
    dockApps?: ReactNode[];
    initialAppId?: string | null;
    notification?: IphoneNotification | null;
    onDismissNotification?: () => void;
    onClock?: () => void;
    isDark?: boolean;
    isLandscape?: boolean;
    device?: DeviceProfile;
    className?: string;
}) {
    const [activeAppId, setActiveAppId] = useState<string | null>(initialAppId);
    const [currentTime, setCurrentTime] = useState('9:41');
    const [motion, setMotion] = useState<'idle' | 'opening' | 'closing'>('idle');
    const [bouncingAppId, setBouncingAppId] = useState<string | null>(null);
    const [surfaceLandscape, setSurfaceLandscape] = useState(isLandscape);
    const [surfaceOrientationMotion, setSurfaceOrientationMotion] = useState<'idle' | 'fadingOut' | 'fadingIn'>('idle');
    const [launchOrigin, setLaunchOrigin] = useState<LaunchOrigin>({x: 0, y: 0, width: 54, height: 54, scaleX: 1, scaleY: 1});
    const [iconTileStyle, setIconTileStyle] = useState<CSSProperties>({});
    const phoneRef = useRef<HTMLElement>(null);
    const flybackRef = useRef<HTMLDivElement>(null);
    const iconRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const closingAppIdRef = useRef<string | null>(null);
    const hasMountedOrientation = useRef(false);
    const activeApp = apps.find(app => app.id === activeAppId);
    const innerRadius = Math.max(device.cornerRadius - 10, 0);

    useEffect(() => setActiveAppId(initialAppId), [initialAppId]);
    useEffect(() => {
        const updateTime = () => setCurrentTime(formatCurrentTime());
        updateTime();
        const timer = window.setInterval(updateTime, 30_000);
        return () => window.clearInterval(timer);
    }, []);
    useEffect(() => {
        if (!hasMountedOrientation.current) {
            hasMountedOrientation.current = true;
            return;
        }
        setSurfaceOrientationMotion('idle');
        const rotateTimer = window.setTimeout(() => setSurfaceOrientationMotion('fadingOut'), 450);
        const swapTimer = window.setTimeout(() => {
            setSurfaceLandscape(isLandscape);
            setSurfaceOrientationMotion('fadingIn');
        }, 530);
        const finishTimer = window.setTimeout(() => setSurfaceOrientationMotion('idle'), 650);
        return () => {
            window.clearTimeout(rotateTimer);
            window.clearTimeout(swapTimer);
            window.clearTimeout(finishTimer);
        };
    }, [isLandscape]);

    const measureIconTarget = (iconButton: HTMLElement, phoneEl: HTMLElement): LaunchOrigin | null => {
        const iconTile = iconButton.querySelector(':scope > span');
        if (!(iconTile instanceof HTMLElement)) return null;
        const phoneRect = phoneEl.getBoundingClientRect();
        const iconBounds = iconTile.getBoundingClientRect();
        const surfaceWidth = phoneEl.clientWidth;
        const surfaceHeight = phoneEl.clientHeight;
        return {
            x: iconBounds.left - phoneRect.left - phoneEl.clientLeft,
            y: iconBounds.top - phoneRect.top - phoneEl.clientTop,
            width: iconBounds.width,
            height: iconBounds.height,
            scaleX: iconBounds.width / surfaceWidth,
            scaleY: iconBounds.height / surfaceHeight
        };
    };
    const captureIconTileStyle = (iconButton: HTMLElement) => {
        const iconTile = iconButton.querySelector(':scope > span');
        const glyph = iconTile?.firstElementChild;
        if (!(iconTile instanceof HTMLElement) || !(glyph instanceof HTMLElement)) return;
        const tileStyles = window.getComputedStyle(iconTile);
        const glyphStyles = window.getComputedStyle(glyph);
        const tileBounds = iconTile.getBoundingClientRect();
        const glyphBounds = glyph.getBoundingClientRect();
        const glyphSize = Number.parseFloat(glyphStyles.fontSize) || 33;
        const tileSize = tileBounds.width || iconTile.clientWidth;
        setIconTileStyle({
            background: tileStyles.background,
            boxShadow: tileStyles.boxShadow,
            color: tileStyles.color,
            '--glyph-scale': String(Math.max(glyphBounds.width / tileSize, glyphBounds.height / tileSize, glyphSize / tileSize)),
            '--glyph-font-scale': String(glyphSize / tileSize),
            '--glyph-shadow': glyphStyles.textShadow,
            '--glyph-tracking': glyphStyles.letterSpacing
        } as CSSProperties);
    };
    const measureIconOrigin = (iconButton: HTMLElement, phoneEl = phoneRef.current): LaunchOrigin | null => {
        if (!phoneEl) return null;
        captureIconTileStyle(iconButton);
        return measureIconTarget(iconButton, phoneEl);
    };

    const openApp = (appId: string, icon: HTMLButtonElement) => {
        if (motion !== 'idle') return;
        const origin = measureIconOrigin(icon);
        if (origin) setLaunchOrigin(origin);
        setActiveAppId(appId);
        setMotion('opening');
        window.setTimeout(() => setMotion('idle'), 320);
    };

    const returnHome = () => {
        if (!activeAppId || motion !== 'idle') return;
        const iconButton = iconRefs.current[activeAppId];
        const origin = iconButton ? measureIconOrigin(iconButton) : null;
        if (!origin) return;
        closingAppIdRef.current = activeAppId;
        setLaunchOrigin(origin);
        setMotion('closing');
    };

    useLayoutEffect(() => {
        if (motion !== 'closing' || !flybackRef.current || !phoneRef.current) return;
        const el = flybackRef.current;
        const phoneEl = phoneRef.current;
        const iconButton = closingAppIdRef.current ? iconRefs.current[closingAppIdRef.current] : null;
        const target = (iconButton ? measureIconTarget(iconButton, phoneEl) : null) ?? launchOrigin;
        const {x, y, width, height} = target;
        const start = {left: '0px', top: '0px', width: `${phoneEl.clientWidth}px`, height: `${phoneEl.clientHeight}px`, borderRadius: `${innerRadius}px`};
        const end = {left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, borderRadius: '14px'};
        Object.assign(el.style, start);
        const shrink = el.animate([start, end], {duration: DISMISS_MS, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards'});
        const settledAppId = closingAppIdRef.current;
        shrink.onfinish = () => {
            setActiveAppId(null);
            setMotion('idle');
            if (settledAppId) {
                setBouncingAppId(settledAppId);
                window.setTimeout(() => setBouncingAppId(null), 220);
            }
            closingAppIdRef.current = null;
        };
        return () => shrink.cancel();
    }, [motion, launchOrigin, innerRadius]);

    const appOpen = Boolean(activeApp) && motion !== 'closing';
    const desktopHidden = appOpen;
    const surfaceOrientation: IphoneOrientation = surfaceLandscape ? 'landscape' : 'portrait';
    const surfaceProps: IphoneSurfaceProps = {
        orientation: surfaceOrientation,
        isLandscape: surfaceLandscape,
        screen: {orientation: {type: surfaceLandscape ? 'landscape-primary' : 'portrait-primary', angle: surfaceLandscape ? 90 : 0}},
        device
    };

    const motionStyle = {
        '--launch-x': `${launchOrigin.x}px`, '--launch-y': `${launchOrigin.y}px`,
        '--launch-scale-x': launchOrigin.scaleX, '--launch-scale-y': launchOrigin.scaleY
    } as CSSProperties;

    const deviceStyle = {'--device-width': `${device.width}px`, '--device-height': `${device.height}px`, '--device-radius': `${device.cornerRadius}px`, '--device-inner-radius': `${innerRadius}px`, '--preview-scale': device.scale ?? 1, '--landscape-home-top': `${(device.height - 202) / 2}px`, '--status-top': `${device.statusTop}px`, '--status-inset': `${device.statusInset}px`, '--status-size': `${device.statusSize}px`, '--notch-width': `${device.notchWidth ?? 154}px`, '--notch-height': `${device.notchHeight ?? 31}px`, width: device.width, height: device.height} as CSSProperties;

    return <section ref={phoneRef} style={deviceStyle} className={`${styles.phone}${isDark ? ` ${styles.dark}` : ''} ${className}`.trim()} aria-label={`${device.label} preview`}>
        {device.cutout === 'island' && <span className={styles.magicIsland} aria-hidden="true"/>}
        {device.cutout === 'notch' && <span className={styles.notch} aria-hidden="true"/>}
        {notification && <button className={styles.notification} onClick={onDismissNotification} aria-label={`Dismiss ${notification.title} notification`}><i>QT</i><span><small>{notification.context}</small><b>{notification.title}</b><em>{notification.body}</em></span></button>}
        <div className={`${styles.desktop} ${desktopHidden ? styles.desktopHidden : ''} ${styles[motion]}`} aria-hidden={desktopHidden}>
            <header className={styles.desktopStatusBar}>
                <button onClick={onClock} aria-label="Show an event notification">{currentTime}</button>
                <span><Icon name="fa-signal"/><b>100%</b><Icon name="fa-battery-full"/></span>
            </header>
            <div className={styles.apps}>{systemApps.map(([icon, label]) => <div className={styles.systemApp} key={label}><span><Icon name={icon}/></span><small>{label}</small></div>)}{apps.map(app => <button key={app.id} ref={node => { iconRefs.current[app.id] = node; }} data-app-id={app.id} onClick={event => openApp(app.id, event.currentTarget)} className={`${styles.appIcon}${bouncingAppId === app.id ? ` ${styles.settling}` : ''}${motion === 'closing' && activeAppId === app.id ? ` ${styles.morphing}` : ''}`} aria-label={`Open ${app.label}`}><span>{app.icon}</span><small>{app.label}</small></button>)}</div>
            {dockApps.length > 0 && <div className={styles.dock}>{dockApps.map((app, index) => <span key={index}>{app}</span>)}</div>}
        </div>
        {appOpen && activeApp && <div style={motionStyle} className={`${styles.appWindow} ${styles[motion]} ${styles[surfaceOrientationMotion]}${surfaceLandscape ? ` ${styles.landscape}` : ''}`}>
            <header className={`${styles.statusBar}${isDark ? ` ${styles.dark}` : ''}`}>
                <button onClick={onClock} aria-label="Show an event notification">{currentTime}</button>
                <span><Icon name="fa-signal"/><b>100%</b><Icon name="fa-battery-full"/></span>
            </header>
            <div className={styles.appSurface} data-ios-orientation={surfaceOrientation} style={{'--iphone-orientation': surfaceOrientation} as CSSProperties}>{typeof activeApp.app === 'function' ? activeApp.app(surfaceProps) : activeApp.app}</div>
            <button className={styles.homeIndicator} onClick={returnHome} aria-label="Return to iPhone Home"/>
        </div>}
        {motion === 'closing' && activeApp && <div ref={flybackRef} className={styles.iconFlyback} aria-hidden="true"><span className={styles.iconFlybackTile} style={iconTileStyle}><span className={styles.iconFlybackGlyph}>{activeApp.icon}</span></span></div>}
        {appOpen && surfaceLandscape && <button className={`${styles.landscapeHomeIndicator} ${styles[surfaceOrientationMotion]}`} onClick={returnHome} aria-label="Return to iPhone Home"/>}
    </section>;
}
