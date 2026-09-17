'use client';

import {useCallback, useMemo, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent} from 'react';
import {AndroidContainer} from './components/AndroidContainer';
import {Icon} from './components/Icon';
import {IphoneContainer, type IphoneSurfaceProps, type IphoneNotification} from './components/IphoneContainer';
import {useContent, ContentProvider} from './lib/use-content';
import {QuickenTreeApp} from './components/QuickenTreeApp';
import type {DeviceManufacturer} from './components/device/types';
import {defaultDeviceId, defaultManufacturerId, getDefaultModelForManufacturer, getModelsForManufacturer, manufacturers} from './components/device/profiles';
import {computePreviewScale} from './components/device/previewScale';

function QuickenTreeIcon() {
    return <b style={{fontSize: 31, letterSpacing: -2, textShadow: '0 3px 8px var(--qt-color-overlay-scrim)'}}>QT</b>;
}

export default function Page() {
    return <ContentProvider><AppPreview/></ContentProvider>;
}
function AppPreview() {
    const {events:eventsData,appConfig} = useContent();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showDevice, setShowDevice] = useState(true);
    const [isStandalonePwa, setIsStandalonePwa] = useState(false);
    const [isDeviceAppOpen, setIsDeviceAppOpen] = useState(false);
    const [notification, setNotification] = useState<IphoneNotification | null>(null);
    const notificationIndex = useRef(0);
    const triggerNotification = useCallback(() => {
        const event = eventsData.events[notificationIndex.current++ % eventsData.events.length];
        if (!event) return;
        setNotification({context: 'THE QUICKEN TREE · EVENT', title: event.title, body: event.notification});
    }, [eventsData]);
    const [isThreeDimensional, setIsThreeDimensional] = useState(false);
    const [isThreeDChassisMounted, setIsThreeDChassisMounted] = useState(false);
    const [threeDRotation, setThreeDRotation] = useState({x: 8, y: -8});
    const [isLandscape, setIsLandscape] = useState(false);
    const [manufacturerId, setManufacturerId] = useState<DeviceManufacturer>(defaultManufacturerId);
    const [deviceId, setDeviceId] = useState(defaultDeviceId);
    const [appleCaseColor, setAppleCaseColor] = useState('black-titanium');
    const [fitScale, setFitScale] = useState(1);
    const [zoomScale, setZoomScale] = useState(1);
    const previewAreaRef = useRef<HTMLDivElement>(null);
    const threeDDragRef = useRef<{pointerId: number; x: number; y: number; rotationX: number; rotationY: number; dragging: boolean} | null>(null);
    const threeDExitTimeoutRef = useRef<number | null>(null);
    const models = getModelsForManufacturer(manufacturerId);
    const device = models.find(profile => profile.id === deviceId) ?? getDefaultModelForManufacturer(manufacturerId);
    const layoutWidth = isLandscape ? device.height : device.width;
    const layoutHeight = isLandscape ? device.width : device.height;
    const previewScale = fitScale * zoomScale;
    const previewDevice = {...device, scale: previewScale};

    useLayoutEffect(() => {
        const standaloneMedia = window.matchMedia('(display-mode: standalone)');
        const fullscreenMedia = window.matchMedia('(display-mode: fullscreen)');
        const updateDisplayMode = () => {
            const standalone = fullscreenMedia.matches || standaloneMedia.matches || Boolean((navigator as Navigator & {standalone?: boolean}).standalone);
            setIsStandalonePwa(standalone);
            if (standalone) setShowDevice(false);
        };
        updateDisplayMode();
        standaloneMedia.addEventListener('change', updateDisplayMode);
        fullscreenMedia.addEventListener('change', updateDisplayMode);
        return () => {
            standaloneMedia.removeEventListener('change', updateDisplayMode);
            fullscreenMedia.removeEventListener('change', updateDisplayMode);
        };
    }, []);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        if (process.env.NODE_ENV === 'development') {
            // Development chunks change between runs; an offline shell can reference
            // chunks that no longer exist. Remove this app's old worker and caches.
            void (async () => {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.filter(registration => {
                    const worker = registration.active ?? registration.waiting ?? registration.installing;
                    return worker && new URL(worker.scriptURL).pathname === '/sw.js';
                }).map(registration => registration.unregister()));
                const keys = await caches.keys();
                await Promise.all(keys.filter(key => key.startsWith('quicken-tree-shell-')).map(key => caches.delete(key)));
            })().catch(() => undefined);
            return;
        }
        navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }, []);

    useLayoutEffect(() => {
        if (!showDevice) return;
        const area = previewAreaRef.current;
        if (!area) return;
        const measure = () => {
            const {width, height} = area.getBoundingClientRect();
            setFitScale(computePreviewScale(width, height, device, isLandscape));
        };
        measure();
        let rafId = 0;
        let cancelled = false;
        rafId = requestAnimationFrame(() => {
            if (cancelled) return;
            rafId = requestAnimationFrame(measure);
        });
        const observer = new ResizeObserver(measure);
        observer.observe(area);
        window.addEventListener('resize', measure);
        return () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
            observer.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [device.width, device.height, device.id, isLandscape, showDevice]);

    useEffect(() => {
        setZoomScale(1);
    }, [device.id, isLandscape, isThreeDimensional]);

    useEffect(() => () => {
        if (threeDExitTimeoutRef.current !== null) window.clearTimeout(threeDExitTimeoutRef.current);
    }, []);

    useEffect(() => {
        const area = previewAreaRef.current;
        if (!area || !showDevice || !isThreeDimensional) return;
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            const factor = event.deltaY > 0 ? 0.97 : 1.03;
            setZoomScale(current => Math.min(1.55, Math.max(0.72, current * factor)));
        };
        area.addEventListener('wheel', onWheel, {passive: false});
        return () => area.removeEventListener('wheel', onWheel);
    }, [showDevice, isThreeDimensional]);

    const previewSurfaceProps: IphoneSurfaceProps = {
        orientation: isLandscape ? 'landscape' : 'portrait',
        isLandscape,
        screen: {orientation: {type: isLandscape ? 'landscape-primary' : 'portrait-primary', angle: isLandscape ? 90 : 0}},
        device
    };
    const advertIndex = useRef(0);
    const showAppAdvert = useCallback(() => {
        if (advertIndex.current++ % 2 === 0) setNotification({...appConfig.menuNotification});
        else triggerNotification();
    }, [triggerNotification, appConfig]);
    const app = useMemo(() => <QuickenTreeApp dark={isDarkMode} onShowNotification={showAppAdvert}/>, [isDarkMode, showAppAdvert]);
    const previewApps = [
        {id: 'quicken-tree', label: 'The Quicken Tree', icon: <QuickenTreeIcon/>, app, keepMounted: true}
    ];
    const installedApp = previewApps[0].app;
    const iosDockApps = [<Icon key="phone" name="fa-phone"/>, <Icon key="messages" name="fa-message"/>, <Icon key="safari" name="fa-compass"/>, <Icon key="camera" name="fa-camera"/>];
    const androidDockApps = [<Icon key="phone" name="fa-phone"/>, <Icon key="messages" name="fa-message"/>, <Icon key="chrome" name="fa-chrome"/>, <Icon key="camera" name="fa-camera"/>];
    const orientationClass = `deviceOrientation${isLandscape ? ' landscape' : ''}`;
    const appleCaseColors = [
        {id: 'black-titanium', label: 'Black titanium', value: 'var(--qt-color-101114)'},
        {id: 'natural-titanium', label: 'Natural titanium', value: 'var(--qt-color-8d8b83)'},
        {id: 'desert-titanium', label: 'Desert titanium', value: 'var(--qt-color-b99b79)'},
        {id: 'white-titanium', label: 'White titanium', value: 'var(--qt-color-d7d4cf)'},
        {id: 'space-black', label: 'Space black', value: 'var(--qt-color-1a1a1d)'},
        {id: 'graphite', label: 'Graphite', value: 'var(--qt-color-55565a)'},
        {id: 'space-grey', label: 'Space grey', value: 'var(--qt-color-5d5f62)'},
        {id: 'silver', label: 'Silver', value: 'var(--qt-color-c8c9cb)'},
        {id: 'starlight', label: 'Starlight', value: 'var(--qt-color-e4dfd1)'},
        {id: 'gold', label: 'Gold', value: 'var(--qt-color-c8a279)'},
        {id: 'rose-gold', label: 'Rose gold', value: 'var(--qt-color-c9958e)'},
        {id: 'deep-purple', label: 'Deep purple', value: 'var(--qt-color-332544)'},
        {id: 'purple', label: 'Purple', value: 'var(--qt-color-7266a7)'},
        {id: 'blue', label: 'Blue', value: 'var(--qt-color-36516a)'},
        {id: 'sierra-blue', label: 'Sierra blue', value: 'var(--qt-color-6f8e9f)'},
        {id: 'green', label: 'Green', value: 'var(--qt-color-506f5b)'},
        {id: 'yellow', label: 'Yellow', value: 'var(--qt-color-d9c552)'},
        {id: 'pink', label: 'Pink', value: 'var(--qt-color-d89cae)'},
        {id: 'coral', label: 'Coral', value: 'var(--qt-color-e47e67)'},
        {id: 'red', label: 'Product red', value: 'var(--qt-color-bd1c35)'},
        {id: 'jet-black', label: 'Jet black', value: 'var(--qt-color-0b0c0e)'}
    ];
    const selectedAppleCase = appleCaseColors.find(colour => colour.id === appleCaseColor) ?? appleCaseColors[0];

    const handleManufacturerChange = (nextManufacturer: DeviceManufacturer) => {
        setManufacturerId(nextManufacturer);
        setDeviceId(getDefaultModelForManufacturer(nextManufacturer).id);
    };

    const toggleThreeD = () => {
        if (threeDExitTimeoutRef.current !== null) {
            window.clearTimeout(threeDExitTimeoutRef.current);
            threeDExitTimeoutRef.current = null;
        }
        if (isThreeDimensional) {
            setIsThreeDimensional(false);
            threeDExitTimeoutRef.current = window.setTimeout(() => {
                setIsThreeDChassisMounted(false);
                threeDExitTimeoutRef.current = null;
            }, 720);
            return;
        }
        setThreeDRotation({x: 8, y: -8});
        setIsThreeDChassisMounted(true);
        requestAnimationFrame(() => setIsThreeDimensional(true));
    };

    const startThreeDDrag = (event: PointerEvent<HTMLDivElement>) => {
        if (!isThreeDimensional || (event.target as HTMLElement).closest('button,input,select,textarea,a,iframe')) return;
        threeDDragRef.current = {pointerId: event.pointerId, x: event.clientX, y: event.clientY, rotationX: threeDRotation.x, rotationY: threeDRotation.y, dragging: false};
        event.currentTarget.setPointerCapture(event.pointerId);
    };

    const moveThreeDDrag = (event: PointerEvent<HTMLDivElement>) => {
        const drag = threeDDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (!drag.dragging && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 9) return;
        drag.dragging = true;
        event.preventDefault();
        setThreeDRotation({x: Math.max(-45, Math.min(45, drag.rotationX - (event.clientY - drag.y) * .12)), y: Math.max(-45, Math.min(45, drag.rotationY + (event.clientX - drag.x) * .12))});
    };

    const endThreeDDrag = (event: PointerEvent<HTMLDivElement>) => {
        const drag = threeDDragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        threeDDragRef.current = null;
        if (drag.dragging) return;
        const controls = [...(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))]
            .map(button => ({button, rect: button.getBoundingClientRect()}))
            .filter(({rect}) => event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom)
            .sort((left, right) => (left.rect.width * left.rect.height) - (right.rect.width * right.rect.height));
        controls[0]?.button.click();
    };

    if (isStandalonePwa) {
        return <main className={`stage fullBleed appOnly${isDarkMode ? ' dark' : ''}`}>
            <section aria-label="The Quicken Tree app">{installedApp}</section>
        </main>;
    }

    return <main className={`stage fullBleed${isDarkMode ? ' dark' : ''}`}>
        {/* This is visible only to standalone/fullscreen PWA CSS before React
            has hydrated and can take the direct-app branch above. */}
        <section className="pwaAppEntry" aria-label="The Quicken Tree app">{installedApp}</section>
        <style>{`.stage.fullBleed,.stage.fullBleed:has(.devicePreviewArea){padding:0!important}.stage.fullBleed:not(.dark){background:radial-gradient(ellipse at 8% 12%,var(--qt-color-fff5c6) 0 9%,transparent 30%),radial-gradient(ellipse at 87% 12%,var(--qt-color-c59bff) 0 9%,transparent 34%),radial-gradient(ellipse at 84% 88%,var(--qt-color-ff9a66) 0 10%,transparent 34%),radial-gradient(ellipse at 19% 78%,var(--qt-color-53cae8) 0 10%,transparent 32%),linear-gradient(145deg,var(--qt-color-ff9cad) 0%,var(--qt-color-f7b4d0) 32%,var(--qt-color-bd9ff4) 62%,var(--qt-color-69cbea) 100%)!important}.stage.fullBleed .presentationMenu{width:100%!important;padding:0!important;background:var(--qt-color-090909cf)!important;border-color:var(--qt-color-ffffff1d)!important}.stage.fullBleed .presentationMenu .themeToggle,.stage.fullBleed .presentationMenu .deviceToggle,.stage.fullBleed .presentationMenu .threeDToggle,.stage.fullBleed .presentationMenu .orientationToggle,.stage.fullBleed .presentationMenu .manufacturerSelect,.stage.fullBleed .presentationMenu .deviceSelect,.stage.fullBleed .presentationMenu .caseSelect{background:var(--qt-color-overlay-surface)!important;border-color:var(--qt-color-overlay-border)!important;color:var(--qt-color-surface)!important}.stage.fullBleed .presentationMenu .themeToggle .fa-solid,.stage.fullBleed .presentationMenu .deviceToggle .fa-solid,.stage.fullBleed .presentationMenu .threeDToggle .fa-solid,.stage.fullBleed .presentationMenu .orientationToggle .fa-solid,.stage.fullBleed .presentationMenu .manufacturerSelect .fa-solid,.stage.fullBleed .presentationMenu .deviceSelect .fa-solid,.stage.fullBleed .presentationMenu .caseSelect .fa-solid{color:var(--qt-color-control-gold)!important}`}</style>
        <style>{`.stage.fullBleed.dark{background:radial-gradient(ellipse at 16% 19%,var(--qt-color-9b24594d) 0%,transparent 31%),radial-gradient(ellipse at 84% 17%,var(--qt-color-5e48cc4d) 0%,transparent 33%),radial-gradient(ellipse at 79% 82%,var(--qt-color-b15b2845) 0%,transparent 35%),radial-gradient(ellipse at 20% 77%,var(--qt-color-0b88905c) 0%,transparent 37%),linear-gradient(145deg,var(--qt-color-0c101d) 0%,var(--qt-color-241326) 48%,var(--qt-color-15101d) 100%)!important;isolation:isolate}.stage.fullBleed.dark:before,.stage.fullBleed.dark:after{display:none}.stage.fullBleed.dark .devicePreviewArea:before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 9% 77%,var(--qt-color-ffba6e90) 0 2px,transparent 7px),radial-gradient(circle at 16% 83%,var(--qt-color-ff5d9d8a) 0 2px,transparent 8px),radial-gradient(circle at 24% 75%,var(--qt-color-ffd57b78) 0 1px,transparent 6px),radial-gradient(circle at 74% 80%,var(--qt-color-9d8dff85) 0 2px,transparent 8px),radial-gradient(circle at 82% 70%,var(--qt-color-ff5f9c82) 0 2px,transparent 8px),radial-gradient(circle at 91% 85%,var(--qt-color-ffd16a78) 0 1px,transparent 6px),radial-gradient(ellipse at 16% 80%,var(--qt-color-ff4d9870) 0%,transparent 16%),radial-gradient(ellipse at 83% 78%,var(--qt-color-735fff69) 0%,transparent 19%);filter:blur(1px);opacity:.82}.stage.fullBleed.dark .devicePreviewArea:after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 11% 80%,var(--qt-color-ffd48a) 0 1px,transparent 5px),radial-gradient(circle at 21% 73%,var(--qt-color-ff80b2) 0 1px,transparent 5px),radial-gradient(circle at 35% 86%,var(--qt-color-f7ba69) 0 1px,transparent 5px),radial-gradient(circle at 67% 76%,var(--qt-color-c1a5ff) 0 1px,transparent 5px),radial-gradient(circle at 79% 85%,var(--qt-color-ff8ab5) 0 1px,transparent 5px),radial-gradient(circle at 90% 74%,var(--qt-color-ffcb79) 0 1px,transparent 5px);filter:blur(3px);opacity:.7}`}</style>
        <style>{`.devicePreview.threeDimensional:before{display:none!important}.devicePreview.threeDimensional .devicePivot{transform:rotateX(0deg) rotateY(0deg) rotateZ(0deg)!important;transition:transform .72s cubic-bezier(.22,1,.36,1)!important}.devicePreview.threeDimensional.isTilted .devicePivot{transform:rotateX(var(--three-d-x)) rotateY(var(--three-d-y)) rotateZ(1deg)!important}`}</style>
        <div className="presentationMenu" aria-label="Preview controls">
            <button className="themeToggle" onClick={() => setIsDarkMode(value => !value)} aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}><Icon name={isDarkMode ? 'fa-sun' : 'fa-moon'}/><span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span></button>
            <button className="deviceToggle" disabled={showDevice && !isDeviceAppOpen} style={showDevice && !isDeviceAppOpen ? {opacity: .38, cursor: 'not-allowed'} : undefined} onClick={() => setShowDevice(value => !value)} aria-label={`${showDevice ? 'Hide' : 'Show'} device preview`}><Icon name={showDevice ? 'fa-mobile-screen-button' : 'fa-expand'}/><span>{showDevice ? 'Hide preview' : 'Device preview'}</span></button>
            <button className="threeDToggle" onClick={toggleThreeD} aria-pressed={isThreeDimensional} aria-label={`${isThreeDimensional ? 'Disable' : 'Enable'} 3D view`}><Icon name="fa-cube"/><span>3D view</span></button>
            <button className="orientationToggle" onClick={() => setIsLandscape(value => !value)} aria-label={`Switch to ${isLandscape ? 'portrait' : 'landscape'} orientation`}><Icon name="fa-rotate"/><span>{isLandscape ? 'Landscape' : 'Portrait'}</span></button>
            <details className="deviceMenu"><summary><Icon name="fa-mobile-screen-button"/><span>Device</span><b>{device.label}</b><Icon name="fa-chevron-down"/></summary><div className="deviceMenuOptions"><label className="manufacturerSelect"><Icon name="fa-industry"/><select value={manufacturerId} onChange={event => handleManufacturerChange(event.target.value as DeviceManufacturer)} aria-label="Device manufacturer">{manufacturers.map(manufacturer => <option key={manufacturer.id} value={manufacturer.id}>{manufacturer.label}</option>)}</select></label><label className="deviceSelect"><Icon name="fa-tablet-screen-button"/><select value={device.id} onChange={event => setDeviceId(event.target.value)} aria-label="Device model">{models.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>{manufacturerId === 'apple' && <label className="caseSelect"><span style={{width: 10, height: 10, borderRadius: '50%', background: selectedAppleCase.value, boxShadow: '0 0 0 1px var(--qt-color-fff5)'}}/><select value={appleCaseColor} onChange={event => setAppleCaseColor(event.target.value)} aria-label="Apple case colour">{appleCaseColors.map(colour => <option key={colour.id} value={colour.id}>{colour.label}</option>)}</select></label>}</div></details>
            <details className="mobileControlMenu">
                <summary aria-label="Open preview controls"><Icon name="fa-bars"/><span>Preview options</span><Icon name="fa-chevron-down"/></summary>
                <div className="mobileControlOptions">
                    <button onClick={() => setIsDarkMode(value => !value)}><Icon name={isDarkMode ? 'fa-sun' : 'fa-moon'}/>{isDarkMode ? 'Light mode' : 'Dark mode'}</button>
                    <button onClick={toggleThreeD} aria-pressed={isThreeDimensional}><Icon name="fa-cube"/>{isThreeDimensional ? 'Standard view' : '3D view'}</button>
                    <button onClick={() => setIsLandscape(value => !value)}><Icon name="fa-rotate"/>{isLandscape ? 'Landscape' : 'Portrait'}</button>
                    <label className="manufacturerSelect"><Icon name="fa-industry"/><span>Make</span><select value={manufacturerId} onChange={event => handleManufacturerChange(event.target.value as DeviceManufacturer)} aria-label="Device manufacturer">{manufacturers.map(manufacturer => <option key={manufacturer.id} value={manufacturer.id}>{manufacturer.label}</option>)}</select></label>
                    <label className="deviceSelect"><Icon name="fa-mobile-screen-button"/><span>Device</span><select value={device.id} onChange={event => setDeviceId(event.target.value)} aria-label="Device model">{models.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
                    {manufacturerId === 'apple' && <label className="caseSelect"><span style={{width: 10, height: 10, borderRadius: '50%', background: selectedAppleCase.value, boxShadow: '0 0 0 1px var(--qt-color-fff5)'}}/><span>Finish</span><select value={appleCaseColor} onChange={event => setAppleCaseColor(event.target.value)} aria-label="Apple case colour">{appleCaseColors.map(colour => <option key={colour.id} value={colour.id}>{colour.label}</option>)}</select></label>}
                </div>
            </details>
        </div>
        <div ref={previewAreaRef} className={`devicePreviewArea${isThreeDChassisMounted ? ' threeDimensional' : ''}`} style={{display: showDevice ? undefined : 'none'}}>
            <div className={`devicePreview${isLandscape ? ' landscape' : ''}${isThreeDChassisMounted ? ' threeDimensional' : ''}${isThreeDimensional ? ' isTilted' : ''}`} style={{width: layoutWidth * previewScale, height: layoutHeight * previewScale, '--three-d-x': `${threeDRotation.x}deg`, '--three-d-y': `${threeDRotation.y}deg`} as CSSProperties} onPointerDown={startThreeDDrag} onPointerMove={moveThreeDDrag} onPointerUp={endThreeDDrag} onPointerCancel={endThreeDDrag}>
                {device.platform === 'android' ? <AndroidContainer className={orientationClass} isDark={isDarkMode} isLandscape={isLandscape} isThreeD={isThreeDChassisMounted} device={previewDevice} apps={previewApps} dockApps={androidDockApps}/>
                    : <IphoneContainer className={orientationClass} isDark={isDarkMode} isLandscape={isLandscape} isThreeD={isThreeDChassisMounted} device={previewDevice} caseColor={selectedAppleCase.value} apps={previewApps} dockApps={iosDockApps} notification={notification} onDismissNotification={() => setNotification(null)} onClock={triggerNotification} onAppOpenChange={setIsDeviceAppOpen}/>} 
            </div>
        </div>
        {!showDevice && <section style={{gridColumn: 1, gridRow: 2, minHeight: 0, overflow: 'hidden'}}>{app}</section>}
    </main>;
}
