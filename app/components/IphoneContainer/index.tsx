'use client';

import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {Icon} from '../Icon';
import {DeviceChassis} from '../device/DeviceChassis';
import {buildDeviceStyle} from '../device/shell';
import type {DeviceOrientation, DeviceProfile, DeviceSurfaceProps, ScreenOrientation} from '../device/types';
import {DISMISS_MS, OPEN_MS, readTilePresentation, rectKeyframe, toViewportRect, TRANSITION_EASING, type PortalTransition, type TilePresentation} from '../device/portal';
import styles from './styles.module.css';

export type {DeviceProfile} from '../device/types';
export type IphoneOrientation = DeviceOrientation;
export type IphoneScreenOrientation = ScreenOrientation;
export type IphoneSurfaceProps = DeviceSurfaceProps;
export type IphoneApp = { id: string; label: string; icon: ReactNode; keepMounted?: boolean; app: ReactNode | ((props: IphoneSurfaceProps) => ReactNode) };
export type IphoneNotification = { context: string; title: string; body: string };

const systemApps = [
    ['fa-calendar-days', 'Calendar'], ['fa-image', 'Photos'], ['fa-music', 'Music'], ['fa-map-location-dot', 'Maps'],
    ['fa-cloud-sun', 'Weather'], ['fa-note-sticky', 'Notes']
] as const;

const formatCurrentTime = () => new Intl.DateTimeFormat(undefined, {hour: 'numeric', minute: '2-digit', hourCycle: 'h23'}).format(new Date());
export {OPEN_MS, DISMISS_MS};

export function IphoneContainer({apps, dockApps = [], initialAppId = null, notification = null, onDismissNotification, onClock = () => undefined, onAppOpenChange = () => undefined, isDark = false, isLandscape = false, isThreeD = false, caseColor, device, className = ''}: {
    apps: IphoneApp[];
    dockApps?: ReactNode[];
    initialAppId?: string | null;
    notification?: IphoneNotification | null;
    onDismissNotification?: () => void;
    onClock?: () => void;
    onAppOpenChange?: (isOpen: boolean) => void;
    isDark?: boolean;
    isLandscape?: boolean;
    isThreeD?: boolean;
    caseColor?: string;
    device: DeviceProfile;
    className?: string;
}) {
    const [activeAppId, setActiveAppId] = useState<string | null>(initialAppId);
    const [currentTime, setCurrentTime] = useState('9:41');
    const [motion, setMotion] = useState<'idle' | 'opening' | 'closing'>('idle');
    const [bouncingAppId, setBouncingAppId] = useState<string | null>(null);
    const [dialledNumber, setDialledNumber] = useState('');
    const [browserAddress, setBrowserAddress] = useState('project-opus.netlify.app');
    const [browserUrl, setBrowserUrl] = useState('https://project-opus.netlify.app/');
    const [browserKey, setBrowserKey] = useState(0);
    const [surfaceLandscape, setSurfaceLandscape] = useState(isLandscape);
    const [surfaceOrientationMotion, setSurfaceOrientationMotion] = useState<'idle' | 'fadingOut' | 'fadingIn'>('idle');
    const [portalTransition, setPortalTransition] = useState<PortalTransition | null>(null);
    const [portalMounted, setPortalMounted] = useState(false);
    const phoneRef = useRef<HTMLElement>(null);
    const appWindowRef = useRef<HTMLDivElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const iconRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const pendingOpenRef = useRef<{appId: string; presentation: TilePresentation} | null>(null);
    const closingAppIdRef = useRef<string | null>(null);
    const hasMountedOrientation = useRef(false);
    const activeApp = apps.find(app => app.id === activeAppId);
    const activeSystemApp = systemApps.find(([, label]) => `system-${label}` === activeAppId);
    const dockLabels = ['Phone', 'Messages', 'Safari', 'Camera'];
    const systemIconBackgrounds: Record<string, string> = {Calendar: 'linear-gradient(145deg,#fb6974,#b70e27)', Photos: 'linear-gradient(145deg,#ff6b78,#7754c6)', Music: 'linear-gradient(145deg,#ff7a68,#8b4bd2)', Maps: 'linear-gradient(145deg,#64d1f4,#2866c8)', Weather: 'linear-gradient(145deg,#69bcff,#5147bd)', Notes: 'linear-gradient(145deg,#ffe066,#e77820)'};
    const dockIconBackgrounds: Record<string, string> = {Phone: 'linear-gradient(145deg,#70df74,#18a844)', Messages: 'linear-gradient(145deg,#5cc8ff,#1664d5)', Safari: 'linear-gradient(145deg,#72caff,#2f5ebb)', Camera: 'linear-gradient(145deg,#7c7d86,#121217)'};
    const activeDockIndex = dockLabels.findIndex(label => `dock-${label}` === activeAppId);
    const activeDockApp = activeDockIndex >= 0 ? {id: `dock-${dockLabels[activeDockIndex]}`, label: dockLabels[activeDockIndex], icon: dockApps[activeDockIndex], app: activeDockIndex === 0 ? <div className={styles.phoneApp}><h1>Phone</h1><div className={styles.phoneTabs}><b>Favourites</b><span>Recents</span><span>Contacts</span></div><div className={styles.contactCard}><i>QT</i><span><b>The Quicken Tree</b><small>Mobile</small></span><button aria-label="Call The Quicken Tree"><Icon name="fa-phone"/></button></div><div className={styles.dialDisplay}>{dialledNumber || 'Enter a number'}</div><div className={styles.keypad}>{[['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'], ['*', ''], ['0', '+'], ['#', '']].map(([key, letters]) => <button key={key} onClick={() => setDialledNumber(value => `${value}${key}`)}>{key}<small>{letters}</small></button>)}</div></div> : activeDockIndex === 2 ? <div className={styles.miniBrowser}><form className={styles.safariToolbar} onSubmit={event => { event.preventDefault(); if (!browserAddress.trim()) return; setBrowserUrl(browserAddress.startsWith('http') ? browserAddress : `https://${browserAddress}`); }}><button type="button" onClick={() => { setBrowserAddress(''); setBrowserUrl(''); }} aria-label="Safari start page"><Icon name="fa-chevron-left"/></button><input value={browserAddress} onChange={event => setBrowserAddress(event.target.value)} placeholder="Search or enter website" aria-label="Browser address"/><button type="submit" aria-label="Go"><Icon name="fa-arrow-right"/></button></form>{browserUrl ? <iframe key={browserKey} title="Safari page" src={browserUrl}/> : <div className={styles.safariStart}><Icon name="fa-compass"/><b>Safari</b><p>Type a URL in the address bar to browse.</p></div>}<footer><button onClick={() => { setBrowserAddress(''); setBrowserUrl(''); }} aria-label="Back"><Icon name="fa-chevron-left"/></button><button onClick={() => setBrowserKey(value => value + 1)} aria-label="Reload"><Icon name="fa-rotate"/></button><button onClick={() => navigator.clipboard?.writeText(browserUrl)} aria-label="Copy address"><Icon name="fa-share-from-square"/></button><button onClick={() => setBrowserAddress(browserUrl)} aria-label="Show address"><Icon name="fa-bookmark"/></button><button onClick={() => { setBrowserAddress(''); setBrowserUrl(''); }} aria-label="Tabs"><Icon name="fa-squares-stacked"/></button></footer></div> : <div className={styles.holdingPage}><span style={{background: dockIconBackgrounds[dockLabels[activeDockIndex]]}}>{dockApps[activeDockIndex]}</span><h1>{dockLabels[activeDockIndex]}</h1></div>} : undefined;
    const activeSurfaceApp = activeApp ?? (activeSystemApp ? {
        id: `system-${activeSystemApp[1]}`,
        label: activeSystemApp[1],
        icon: <Icon name={activeSystemApp[0]}/>,
        app: <div className={styles.holdingPage}><span style={{background: systemIconBackgrounds[activeSystemApp[1]]}}><Icon name={activeSystemApp[0]}/></span><h1>{activeSystemApp[1]}</h1></div>
    } : activeDockApp);
    const innerRadius = Math.max(device.cornerRadius - 10, 0);

    useEffect(() => onAppOpenChange(Boolean(activeSurfaceApp)), [activeSurfaceApp, onAppOpenChange]);

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
            setActiveAppId(appId);
            return;
        }
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
            setActiveAppId(null);
            return;
        }
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
        // Reveal the already-mounted app while the icon expands, rather than
        // replacing an opaque placeholder with the app at the final frame.
        const liveSurface = appWindowRef.current;
        const liveContent = liveSurface?.querySelector<HTMLElement>(`.${styles.appSurface}`);
        const closeZoom = phase === 'closing' && liveContent ? liveContent.animate([
            {transformOrigin: '0 0', transform: 'translate(0px, 0px) scale(1, 1)'},
            {transformOrigin: '0 0', transform: `translate(${(to.left - from.left) / from.width * liveContent.clientWidth}px, ${(to.top - from.top) / from.height * liveContent.clientHeight}px) scale(${to.width / from.width}, ${to.height / from.height})`}
        ], {duration, easing: TRANSITION_EASING, fill: 'both'}) : undefined;
        const closeClip = phase === 'closing' && liveSurface ? liveSurface.animate([
            {clipPath: `inset(0% 0% 0% 0% round ${startRadius}px)`},
            {clipPath: `inset(${(to.top - from.top) / from.height * 100}% ${(from.left + from.width - to.left - to.width) / from.width * 100}% ${(from.top + from.height - to.top - to.height) / from.height * 100}% ${(to.left - from.left) / from.width * 100}% round ${endRadius}px)`}
        ], {duration, easing: TRANSITION_EASING, fill: 'both'}) : undefined;
        const closeFade = phase === 'closing' && liveSurface ? liveSurface.animate([
            {opacity: 1}, {opacity: 0}
        ], {duration: duration * .5, delay: duration * .08, easing: 'ease-in-out', fill: 'both'}) : undefined;
        const contentZoom = phase === 'opening' && liveContent ? liveContent.animate([
            {
                transformOrigin: '0 0',
                transform: `translate(${(from.left - to.left) / to.width * liveContent.clientWidth}px, ${(from.top - to.top) / to.height * liveContent.clientHeight}px) scale(${from.width / to.width}, ${from.height / to.height})`
            },
            {transformOrigin: '0 0', transform: 'translate(0px, 0px) scale(1, 1)'}
        ], {duration, easing: TRANSITION_EASING, fill: 'both'}) : undefined;
        const revealAnim = phase === 'opening' && liveSurface ? liveSurface.animate([
            {clipPath: `inset(${(from.top - to.top) / to.height * 100}% ${(to.left + to.width - from.left - from.width) / to.width * 100}% ${(to.top + to.height - from.top - from.height) / to.height * 100}% ${(from.left - to.left) / to.width * 100}% round ${startRadius}px)`},
            {clipPath: `inset(0% 0% 0% 0% round ${endRadius}px)`}
        ], {duration, easing: TRANSITION_EASING, fill: 'both'}) : undefined;
        const overlayFade = phase === 'opening' ? overlay.animate([
            {opacity: 1, offset: 0},
            {opacity: 1, offset: 0.15},
            {opacity: 0, offset: 0.85},
            {opacity: 0, offset: 1}
        ], {duration, easing: 'ease-out', fill: 'forwards'}) : undefined;
        const backdrop = backdropRef.current;
        const backdropAnim = backdrop?.animate(
            phase === 'opening'
                ? [{opacity: 0}, {opacity: 1}]
                : [{opacity: 0}, {opacity: 0}],
            {duration: Math.round(duration * 0.42), easing: 'ease-out', fill: 'forwards'}
        );
        const tile = overlay.querySelector(`.${styles.transitionTile}`);
        const tileAnim = tile?.animate(
            phase === 'opening'
                ? [{opacity: 1}, {opacity: 0}]
                : [{opacity: 0}, {opacity: 1}],
            {duration: Math.round(duration * (phase === 'closing' ? 0.5 : 0.38)), delay: phase === 'closing' ? Math.round(duration * 0.08) : 0, easing: 'ease-in-out', fill: 'both'}
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
            revealAnim?.cancel();
            contentZoom?.cancel();
            overlayFade?.cancel();
            closeZoom?.cancel();
            closeClip?.cancel();
            closeFade?.cancel();
        };
    }, [portalTransition]);

    const appMounted = Boolean(activeSurfaceApp);
    const appVisible = Boolean(activeSurfaceApp);
    const desktopHidden = Boolean(activeSurfaceApp) && motion !== 'closing';
    const morphingAppId = motion === 'closing' ? activeAppId : null;
    const desktopLandscape = isLandscape && device.category === 'tablet';
    const surfaceOrientation: IphoneOrientation = surfaceLandscape ? 'landscape' : 'portrait';
    const surfaceProps: IphoneSurfaceProps = {
        orientation: surfaceOrientation,
        isLandscape: surfaceLandscape,
        screen: {orientation: {type: surfaceLandscape ? 'landscape-primary' : 'portrait-primary', angle: surfaceLandscape ? 90 : 0}},
        device
    };

    const deviceStyle = buildDeviceStyle(device, caseColor ? {'--case-color': caseColor} as CSSProperties : undefined);

    const portal = portalMounted && portalTransition ? createPortal(
        <div ref={overlayRef} className={styles.transitionOverlay} aria-hidden="true">
            <div ref={backdropRef} className={`${styles.transitionBackdrop}${portalTransition.isDark ? ` ${styles.dark}` : ''}`}/>
            <span className={styles.transitionTile} style={{...portalTransition.tileStyle, ...portalTransition.glyphStyle}}>
                <span className={styles.transitionGlyph}>{portalTransition.icon}</span>
            </span>
        </div>,
        document.body
    ) : null;

    const shellClassName = [styles.phone, isThreeD && styles.threeDShell, isDark && styles.dark, device.category === 'tablet' && styles.tablet, !isThreeD && className].filter(Boolean).join(' ');

    return <>
        <DeviceChassis enabled={isThreeD} device={device} caseColor={caseColor} className={isThreeD ? className : undefined} style={isThreeD ? deviceStyle : undefined}>
        <section ref={phoneRef} style={isThreeD ? {width: '100%', height: '100%'} : deviceStyle} className={shellClassName} aria-label={`${device.label} preview`}>
            {device.cutout === 'island' && <span className={styles.magicIsland} aria-hidden="true"/>}
            {device.cutout === 'notch' && <span className={styles.notch} aria-hidden="true"/>}
            {notification && <div className={`${styles.notificationLayer}${isLandscape ? ` ${styles.landscape}` : ''}`} role="status" aria-live="polite"><button key={`${notification.title}-${notification.body}`} className={styles.notification} onClick={onDismissNotification} aria-label={`Dismiss ${notification.title} notification`}><i>QT</i><span><small>{notification.context}</small><b>{notification.title}</b><em>{notification.body}</em></span></button></div>}
            <div className={`${styles.desktop}${desktopLandscape ? ` ${styles.landscape}` : ''}${desktopHidden ? ` ${styles.desktopHidden}` : ''}`} aria-hidden={desktopHidden}>
                <header className={styles.desktopStatusBar}>
                    <button onClick={onClock} aria-label="Show an event notification">{currentTime}</button>
                    <span><Icon name="fa-signal"/><b>100%</b><Icon name="fa-battery-full"/></span>
                </header>
                <div className={styles.apps}>{systemApps.map(([icon, label]) => { const id = `system-${label}`; return <button key={label} ref={node => { iconRefs.current[id] = node; }} onClick={event => openApp(id, event.currentTarget)} className={`${styles.systemApp}${bouncingAppId === id ? ` ${styles.settling}` : ''}${morphingAppId === id ? ` ${styles.morphing}` : ''}`} aria-label={`Open ${label}`}><span><Icon name={icon}/></span><small>{label}</small></button>; })}{apps.map(app => <button key={app.id} ref={node => { iconRefs.current[app.id] = node; }} data-app-id={app.id} onClick={event => openApp(app.id, event.currentTarget)} className={`${styles.appIcon}${bouncingAppId === app.id ? ` ${styles.settling}` : ''}${morphingAppId === app.id ? ` ${styles.morphing}` : ''}`} aria-label={`Open ${app.label}`}><span>{app.icon}</span><small>{app.label}</small></button>)}</div>
                {dockApps.length > 0 && <div className={styles.dock}>{dockApps.map((app, index) => { const label = dockLabels[index] ?? `App ${index + 1}`; const id = `dock-${label}`; return <button key={index} ref={node => { iconRefs.current[id] = node; }} onClick={event => openApp(id, event.currentTarget)} className={morphingAppId === id ? styles.morphing : undefined} aria-label={`Open ${label}`}><span>{app}</span></button>; })}</div>}
            </div>
            <div ref={appWindowRef} inert={!appMounted || motion !== 'idle'} aria-hidden={!appMounted || !appVisible} className={`${styles.appWindow}${appMounted && appVisible ? '' : ` ${styles.appHidden}`} ${styles[surfaceOrientationMotion]}${surfaceLandscape ? ` ${styles.landscape}` : ''}`}>
                <header className={`${styles.statusBar}${isDark ? ` ${styles.dark}` : ''}`}>
                    <button onClick={onClock} aria-label="Show an event notification">{currentTime}</button>
                    <span><Icon name="fa-signal"/><b>100%</b><Icon name="fa-battery-full"/></span>
                </header>
                <div className={styles.appSurface} data-ios-orientation={surfaceOrientation} style={{'--iphone-orientation': surfaceOrientation} as CSSProperties}>
                    {apps.filter(app => app.keepMounted).map(app => <div key={app.id} inert={activeAppId !== app.id || !appMounted} aria-hidden={activeAppId !== app.id || !appMounted} style={{position: 'absolute', inset: 0, opacity: activeAppId === app.id && appMounted && appVisible ? 1 : 0, pointerEvents: activeAppId === app.id && appMounted && appVisible ? 'auto' : 'none'}}>
                        {typeof app.app === 'function' ? app.app(surfaceProps) : app.app}
                    </div>)}
                    {appMounted && activeSurfaceApp && !activeApp?.keepMounted && <div key={activeSurfaceApp.id} style={{position: 'absolute', inset: 0}}>{typeof activeSurfaceApp.app === 'function' ? activeSurfaceApp.app(surfaceProps) : activeSurfaceApp.app}</div>}
                </div>
                <button className={styles.homeIndicator} onClick={returnHome} aria-label="Return to iPhone Home"/>
            </div>
            {appMounted && appVisible && surfaceLandscape && <button className={`${styles.landscapeHomeIndicator} ${styles[surfaceOrientationMotion]}`} onClick={returnHome} aria-label="Return to iPhone Home"/>}
        </section>
        </DeviceChassis>
        {portal}
    </>;
}
