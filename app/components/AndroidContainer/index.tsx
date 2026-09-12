'use client';

import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from '../Icon';
import {DeviceChassis} from '../device/DeviceChassis';
import {buildDeviceStyle} from '../device/shell';
import type {DeviceProfile, DeviceSurfaceProps} from '../device/types';
import {DISMISS_MS, OPEN_MS, readTilePresentation, rectKeyframe, toViewportRect, TRANSITION_EASING, type PortalTransition, type TilePresentation} from '../device/portal';
import styles from './styles.module.css';

export type AndroidApp = { id: string; label: string; icon: ReactNode; app: ReactNode | ((props: DeviceSurfaceProps) => ReactNode) };

const systemApps = [
    ['fa-calendar-days', 'Calendar'], ['fa-image', 'Photos'], ['fa-envelope', 'Gmail'], ['fa-map-location-dot', 'Maps'],
    ['fa-cloud-sun', 'Weather'], ['fa-note-sticky', 'Keep']
] as const;

const formatCurrentTime = () => new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit', hourCycle: 'h23'}).format(new Date());

function AndroidNavBar({onBack, onHome, onRecents, launcher = false}: {onBack?: () => void; onHome?: () => void; onRecents?: () => void; launcher?: boolean}) {
    return <div role="navigation" className={`${styles.buttonNav}${launcher ? ` ${styles.buttonNavLauncher}` : ''}`} aria-label="System navigation" aria-hidden={launcher}>
        <button type="button" className={styles.navButton} onClick={launcher ? undefined : onBack} aria-label="Back" tabIndex={launcher ? -1 : 0}><Icon name="fa-chevron-left"/></button>
        <button type="button" className={styles.navButton} onClick={launcher ? undefined : onHome} aria-label="Home" tabIndex={launcher ? -1 : 0}><span className={styles.homeIcon} aria-hidden="true"/></button>
        <button type="button" className={styles.navButton} onClick={launcher ? undefined : onRecents} aria-label="Recents" tabIndex={launcher ? -1 : 0}><span className={styles.recentsIcon} aria-hidden="true"/></button>
    </div>;
}

export function AndroidContainer({apps, dockApps = [], initialAppId = null, isDark = false, isLandscape = false, isThreeD = false, device, className = ''}: {
    apps: AndroidApp[];
    dockApps?: ReactNode[];
    initialAppId?: string | null;
    isDark?: boolean;
    isLandscape?: boolean;
    isThreeD?: boolean;
    device: DeviceProfile;
    className?: string;
}) {
    const [activeAppId, setActiveAppId] = useState<string | null>(initialAppId);
    const [currentTime, setCurrentTime] = useState('9:41');
    const [motion, setMotion] = useState<'idle' | 'opening' | 'closing'>('idle');
    const [bouncingAppId, setBouncingAppId] = useState<string | null>(null);
    const [browserAddress, setBrowserAddress] = useState('project-opus.netlify.app');
    const [browserUrl, setBrowserUrl] = useState('https://project-opus.netlify.app/');
    const [browserKey, setBrowserKey] = useState(0);
    const [surfaceLandscape, setSurfaceLandscape] = useState(isLandscape);
    const [surfaceOrientationMotion, setSurfaceOrientationMotion] = useState<'idle' | 'fadingOut' | 'fadingIn'>('idle');
    const [portalTransition, setPortalTransition] = useState<PortalTransition | null>(null);
    const [portalMounted, setPortalMounted] = useState(false);
    const [showRecents, setShowRecents] = useState(false);
    const appWindowRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const iconRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const pendingOpenRef = useRef<{appId: string; presentation: TilePresentation} | null>(null);
    const closingAppIdRef = useRef<string | null>(null);
    const hasMountedOrientation = useRef(false);
    const activeApp = apps.find(app => app.id === activeAppId);
    const activeSystemApp = systemApps.find(([, label]) => `system-${label}` === activeAppId);
    const dockLabels = ['Phone', 'Messages', 'Chrome', 'Camera'];
    const dockIconBackgrounds: Record<string, string> = {Phone: 'linear-gradient(145deg,var(--qt-color-66bb6a),var(--qt-color-2e7d32))', Messages: 'linear-gradient(145deg,var(--qt-color-42a5f5),var(--qt-color-1565c0))', Chrome: 'linear-gradient(145deg,var(--qt-color-ef5350),var(--qt-color-c62828))', Camera: 'linear-gradient(145deg,var(--qt-color-78909c),var(--qt-color-37474f))'};
    const activeDockIndex = dockLabels.findIndex(label => `dock-${label}` === activeAppId);
    const activeDockApp = activeDockIndex >= 0 ? {
        id: `dock-${dockLabels[activeDockIndex]}`,
        label: dockLabels[activeDockIndex],
        icon: dockApps[activeDockIndex],
        app: activeDockIndex === 2 ? <div className={styles.miniBrowser}>
            <form onSubmit={event => { event.preventDefault(); if (!browserAddress.trim()) return; setBrowserUrl(browserAddress.startsWith('http') ? browserAddress : `https://${browserAddress}`); }}>
                <button type="button" onClick={() => { setBrowserAddress(''); setBrowserUrl(''); }} aria-label="Chrome start page"><Icon name="fa-chevron-left"/></button>
                <input value={browserAddress} onChange={event => setBrowserAddress(event.target.value)} placeholder="Search or type URL" aria-label="Browser address"/>
                <button type="submit" aria-label="Go"><Icon name="fa-arrow-right"/></button>
            </form>
            {browserUrl ? <iframe key={browserKey} title="Chrome page" src={browserUrl}/> : <div className={styles.chromeStart}><Icon name="fa-chrome"/><b>Chrome</b><p>Type a URL in the address bar to browse.</p></div>}
            <footer>
                <button onClick={() => { setBrowserAddress(''); setBrowserUrl(''); }} aria-label="Back"><Icon name="fa-chevron-left"/></button>
                <button onClick={() => setBrowserKey(value => value + 1)} aria-label="Reload"><Icon name="fa-rotate"/></button>
                <button onClick={() => navigator.clipboard?.writeText(browserUrl)} aria-label="Share"><Icon name="fa-share-from-square"/></button>
                <button onClick={() => setBrowserAddress(browserUrl)} aria-label="Tabs"><Icon name="fa-squares-stacked"/></button>
            </footer>
        </div> : <div className={styles.holdingPage}><span style={{background: dockIconBackgrounds[dockLabels[activeDockIndex]]}}>{dockApps[activeDockIndex]}</span><h1>{dockLabels[activeDockIndex]}</h1></div>
    } : undefined;
    const activeSurfaceApp = activeApp ?? (activeSystemApp ? {
        id: `system-${activeSystemApp[1]}`,
        label: activeSystemApp[1],
        icon: <Icon name={activeSystemApp[0]}/>,
        app: <div className={styles.holdingPage}><span><Icon name={activeSystemApp[0]}/></span><h1>{activeSystemApp[1]}</h1></div>
    } : activeDockApp);
    const innerRadius = Math.max(device.cornerRadius - 8, 0); // matches buildDeviceStyle bezel

    const resolveIcon = (appId: string) => {
        const registered = apps.find(app => app.id === appId);
        if (registered) return registered.icon;
        const system = systemApps.find(([, label]) => `system-${label}` === appId);
        if (system) return <Icon name={system[0]}/>;
        const dockIndex = dockLabels.findIndex(label => `dock-${label}` === appId);
        if (dockIndex >= 0) return dockApps[dockIndex];
        return null;
    };

    useEffect(() => setPortalMounted(true), []);
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
    useEffect(() => {
        if (browserUrl) setBrowserKey(value => value + 1);
    }, [surfaceLandscape]);

    const openApp = (appId: string, icon: HTMLButtonElement) => {
        if (motion !== 'idle') return;
        if (isThreeD) {
            setShowRecents(false);
            setActiveAppId(appId);
            return;
        }
        setShowRecents(false);
        const presentation = readTilePresentation(icon);
        if (!presentation) return;
        presentation.icon = resolveIcon(appId);
        pendingOpenRef.current = {appId, presentation};
        setActiveAppId(appId);
        setMotion('opening');
    };

    const returnHome = () => {
        if (!activeAppId || motion !== 'idle' || !appWindowRef.current) return;
        if (isThreeD) {
            setShowRecents(false);
            setActiveAppId(null);
            return;
        }
        setShowRecents(false);
        const iconButton = iconRefs.current[activeAppId];
        const presentation = iconButton ? readTilePresentation(iconButton) : null;
        if (!presentation) return;
        presentation.icon = resolveIcon(activeAppId);
        closingAppIdRef.current = activeAppId;
        setPortalTransition({
            phase: 'closing',
            appId: activeAppId,
            from: toViewportRect(appWindowRef.current.getBoundingClientRect()),
            to: presentation.rect,
            startRadius: innerRadius,
            endRadius: presentation.radius,
            tileStyle: presentation.tileStyle,
            glyphStyle: presentation.glyphStyle,
            icon: presentation.icon,
            isDark
        });
        setMotion('closing');
    };

    useLayoutEffect(() => {
        if (motion !== 'opening' || !pendingOpenRef.current || !appWindowRef.current) return;
        const {appId, presentation} = pendingOpenRef.current;
        setPortalTransition({
            phase: 'opening',
            appId,
            from: presentation.rect,
            to: toViewportRect(appWindowRef.current.getBoundingClientRect()),
            startRadius: presentation.radius,
            endRadius: innerRadius,
            tileStyle: presentation.tileStyle,
            glyphStyle: presentation.glyphStyle,
            icon: presentation.icon,
            isDark
        });
        pendingOpenRef.current = null;
    }, [motion, activeAppId, activeSurfaceApp, innerRadius, isDark]);

    useLayoutEffect(() => {
        if (!portalTransition || !overlayRef.current) return;
        const {phase, startRadius, endRadius, appId} = portalTransition;
        let from = portalTransition.from;
        let to = portalTransition.to;
        if (phase === 'closing') {
            const iconButton = iconRefs.current[appId];
            const iconTile = iconButton?.querySelector(':scope > span');
            if (iconTile instanceof HTMLElement) to = toViewportRect(iconTile.getBoundingClientRect());
        }
        const overlay = overlayRef.current;
        const duration = phase === 'opening' ? OPEN_MS : DISMISS_MS;
        const startFrame = rectKeyframe(from, startRadius);
        const endFrame = rectKeyframe(to, endRadius);
        Object.assign(overlay.style, startFrame);
        const motionAnim = overlay.animate([startFrame, endFrame], {duration, easing: TRANSITION_EASING, fill: 'forwards'});
        const backdrop = backdropRef.current;
        const backdropAnim = backdrop?.animate(
            phase === 'opening' ? [{opacity: 0}, {opacity: 1}] : [{opacity: 1}, {opacity: 0}],
            {duration: Math.round(duration * 0.42), easing: 'ease-out', fill: 'forwards'}
        );
        const tile = overlay.querySelector(`.${styles.transitionTile}`);
        const tileAnim = tile?.animate(
            phase === 'opening' ? [{opacity: 1}, {opacity: 0}] : [{opacity: 0}, {opacity: 1}],
            {duration: Math.round(duration * 0.38), delay: phase === 'closing' ? Math.round(duration * 0.08) : 0, easing: 'ease-out', fill: 'forwards'}
        );
        motionAnim.onfinish = () => {
            if (phase === 'closing') {
                setActiveAppId(null);
                setBouncingAppId(appId);
                window.setTimeout(() => setBouncingAppId(null), 460);
                closingAppIdRef.current = null;
            }
            setPortalTransition(null);
            setMotion('idle');
        };
        return () => {
            motionAnim.cancel();
            backdropAnim?.cancel();
            tileAnim?.cancel();
        };
    }, [portalTransition]);

    const appMounted = Boolean(activeSurfaceApp) && motion !== 'closing';
    const appVisible = motion === 'idle';
    const launcherHidden = Boolean(activeSurfaceApp) && motion !== 'closing';
    const morphingAppId = motion === 'closing' ? activeAppId : null;
    const surfaceOrientation = surfaceLandscape ? 'landscape' : 'portrait';
    const surfaceProps: DeviceSurfaceProps = {
        orientation: surfaceOrientation,
        isLandscape: surfaceLandscape,
        screen: {orientation: {type: surfaceLandscape ? 'landscape-primary' : 'portrait-primary', angle: surfaceLandscape ? 90 : 0}},
        device
    };

    const deviceStyle = buildDeviceStyle(device);

    const portal = portalMounted && portalTransition ? createPortal(
        <div ref={overlayRef} className={styles.transitionOverlay} aria-hidden="true">
            <div ref={backdropRef} className={`${styles.transitionBackdrop}${portalTransition.isDark ? ` ${styles.dark}` : ''}`}/>
            <span className={styles.transitionTile} style={{...portalTransition.tileStyle, ...portalTransition.glyphStyle}}>
                <span className={styles.transitionGlyph}>{portalTransition.icon}</span>
            </span>
        </div>,
        document.body
    ) : null;

    const skinClass = device.manufacturer === 'samsung' ? styles.samsung : styles.google;
    const launcherLandscape = isLandscape && device.category === 'tablet';

    const shellClassName = [styles.androidDevice, isThreeD && styles.threeDShell, skinClass, isDark && styles.dark, device.category === 'tablet' && styles.tablet, !isThreeD && className].filter(Boolean).join(' ');

    return <>
        <DeviceChassis enabled={isThreeD} device={device} className={isThreeD ? className : undefined} style={isThreeD ? deviceStyle : undefined}>
        <section style={isThreeD ? {width: '100%', height: '100%'} : deviceStyle} className={shellClassName} aria-label={`${device.label} preview`}>
            {device.cutout === 'hole' && <span className={styles.punchHole} aria-hidden="true"/>}
            <div className={`${styles.launcher}${launcherLandscape ? ` ${styles.landscape}` : ''}${launcherHidden ? ` ${styles.launcherHidden}` : ''}`} aria-hidden={launcherHidden}>
                <header className={styles.statusBar}>
                    <button aria-label="Current time">{currentTime}</button>
                    <span><Icon name="fa-signal"/><Icon name="fa-wifi"/><Icon name="fa-battery-full"/></span>
                </header>
                {device.manufacturer === 'google' && <div className={styles.searchBar}><Icon name="fa-search"/>Search apps, web and more</div>}
                <div className={styles.apps}>
                    {systemApps.map(([icon, label]) => {
                        const id = `system-${label}`;
                        return <button key={label} ref={node => { iconRefs.current[id] = node; }} onClick={event => openApp(id, event.currentTarget)} className={`${styles.systemApp}${bouncingAppId === id ? ` ${styles.settling}` : ''}${morphingAppId === id ? ` ${styles.morphing}` : ''}`} aria-label={`Open ${label}`}><span><Icon name={icon}/></span><small>{label}</small></button>;
                    })}
                    {apps.map(app => <button key={app.id} ref={node => { iconRefs.current[app.id] = node; }} onClick={event => openApp(app.id, event.currentTarget)} className={`${styles.appButton}${bouncingAppId === app.id ? ` ${styles.settling}` : ''}${morphingAppId === app.id ? ` ${styles.morphing}` : ''}`} aria-label={`Open ${app.label}`}><span>{app.icon}</span><small>{app.label}</small></button>)}
                </div>
                {dockApps.length > 0 && <div className={styles.dock}>{dockApps.map((app, index) => {
                    const label = dockLabels[index] ?? `App ${index + 1}`;
                    const id = `dock-${label}`;
                    return <button key={index} ref={node => { iconRefs.current[id] = node; }} onClick={event => openApp(id, event.currentTarget)} className={morphingAppId === id ? styles.morphing : undefined} aria-label={`Open ${label}`}><span>{app}</span></button>;
                })}</div>}
                <AndroidNavBar launcher/>
            </div>
            {appMounted && activeSurfaceApp && <div ref={appWindowRef} className={`${styles.appWindow}${appVisible ? '' : ` ${styles.appHidden}`} ${styles[surfaceOrientationMotion]}${surfaceLandscape ? ` ${styles.landscape}` : ''}`}>
                <header className={styles.statusBar}>
                    <button aria-label="Current time">{currentTime}</button>
                    <span><Icon name="fa-signal"/><Icon name="fa-wifi"/><Icon name="fa-battery-full"/></span>
                </header>
                <div className={styles.appSurface} data-android-orientation={surfaceOrientation}>{typeof activeSurfaceApp.app === 'function' ? activeSurfaceApp.app(surfaceProps) : activeSurfaceApp.app}</div>
                {showRecents && <button type="button" className={styles.recentsOverlay} onClick={() => setShowRecents(false)} aria-label="Close recents"><span>No recent apps</span></button>}
                <AndroidNavBar onBack={returnHome} onHome={returnHome} onRecents={() => setShowRecents(value => !value)}/>
            </div>}
        </section>
        </DeviceChassis>
        {portal}
    </>;
}
