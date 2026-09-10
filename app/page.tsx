'use client';

import {useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent} from 'react';
import {AndroidContainer} from './components/AndroidContainer';
import {Icon} from './components/Icon';
import {IphoneContainer, type IphoneSurfaceProps} from './components/IphoneContainer';
import type {DeviceManufacturer} from './components/device/types';
import {defaultDeviceId, defaultManufacturerId, getDefaultModelForManufacturer, getModelsForManufacturer, manufacturers} from './components/device/profiles';
import {computePreviewScale} from './components/device/previewScale';

function QuickenTreeIcon() {
    return <b style={{fontSize: 31, letterSpacing: -2, textShadow: '0 3px 8px #0008'}}>QT</b>;
}

function AppPlaceholder({dark = false, title = 'THE QUICKEN TREE', message = 'App surface placeholder', orientation = 'portrait', screen, platform}: { dark?: boolean; title?: string; message?: string; orientation?: IphoneSurfaceProps['orientation']; screen: IphoneSurfaceProps['screen']; platform: 'ios' | 'android' }) {
    return <div data-ios-orientation={platform === 'ios' ? orientation : undefined} data-android-orientation={platform === 'android' ? orientation : undefined} style={{height: '100%', display: 'grid', placeItems: 'center', background: dark ? '#171616' : '#fafafa', color: dark ? '#f7f3ee' : '#171717', textAlign: 'center', padding: 32}}>
        <div><b style={{display: 'block', color: '#cf122d', fontSize: 14, letterSpacing: 2}}>{title}</b><p style={{margin: '10px 0 0', fontSize: 18}}>{message}</p><small style={{display: 'block', marginTop: 10, color: dark ? '#c5bcb3' : '#6d655e', fontSize: 12}}>screen.orientation: {screen.orientation.type} ({screen.orientation.angle}°)</small></div>
    </div>;
}

export default function Page() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showDevice, setShowDevice] = useState(true);
    const [isDeviceAppOpen, setIsDeviceAppOpen] = useState(false);
    const [isThreeDimensional, setIsThreeDimensional] = useState(false);
    const [threeDRotation, setThreeDRotation] = useState({x: 12, y: -22});
    const [isLandscape, setIsLandscape] = useState(false);
    const [manufacturerId, setManufacturerId] = useState<DeviceManufacturer>(defaultManufacturerId);
    const [deviceId, setDeviceId] = useState(defaultDeviceId);
    const [appleCaseColor, setAppleCaseColor] = useState('black-titanium');
    const [fitScale, setFitScale] = useState(1);
    const [zoomScale, setZoomScale] = useState(1);
    const previewAreaRef = useRef<HTMLDivElement>(null);
    const threeDDragRef = useRef<{pointerId: number; x: number; y: number; rotationX: number; rotationY: number; dragging: boolean} | null>(null);
    const models = getModelsForManufacturer(manufacturerId);
    const device = models.find(profile => profile.id === deviceId) ?? getDefaultModelForManufacturer(manufacturerId);
    const layoutWidth = isLandscape ? device.height : device.width;
    const layoutHeight = isLandscape ? device.width : device.height;
    const previewScale = fitScale * zoomScale;
    const previewDevice = {...device, scale: previewScale};

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
    const renderApp = ({orientation, screen}: IphoneSurfaceProps) => <AppPlaceholder dark={isDarkMode} orientation={orientation} screen={screen} platform={device.platform}/>;
    const renderRewardsApp = ({orientation, screen}: IphoneSurfaceProps) => <AppPlaceholder dark={isDarkMode} title="QT REWARDS" message="Rewards app surface placeholder" orientation={orientation} screen={screen} platform={device.platform}/>;
    const app = renderApp(previewSurfaceProps);
    const previewApps = [
        {id: 'quicken-tree', label: 'The Quicken Tree', icon: <QuickenTreeIcon/>, app: renderApp},
        {id: 'rewards', label: 'QT Rewards', icon: <Icon name="fa-gift"/>, app: renderRewardsApp}
    ];
    const iosDockApps = [<Icon key="phone" name="fa-phone"/>, <Icon key="messages" name="fa-message"/>, <Icon key="safari" name="fa-compass"/>, <Icon key="camera" name="fa-camera"/>];
    const androidDockApps = [<Icon key="phone" name="fa-phone"/>, <Icon key="messages" name="fa-message"/>, <Icon key="chrome" name="fa-chrome"/>, <Icon key="camera" name="fa-camera"/>];
    const orientationClass = `deviceOrientation${isLandscape ? ' landscape' : ''}`;
    const appleCaseColors = [
        {id: 'black-titanium', label: 'Black titanium', value: '#101114'},
        {id: 'natural-titanium', label: 'Natural titanium', value: '#8d8b83'},
        {id: 'desert-titanium', label: 'Desert titanium', value: '#b99b79'},
        {id: 'white-titanium', label: 'White titanium', value: '#d7d4cf'},
        {id: 'space-black', label: 'Space black', value: '#1a1a1d'},
        {id: 'graphite', label: 'Graphite', value: '#55565a'},
        {id: 'space-grey', label: 'Space grey', value: '#5d5f62'},
        {id: 'silver', label: 'Silver', value: '#c8c9cb'},
        {id: 'starlight', label: 'Starlight', value: '#e4dfd1'},
        {id: 'gold', label: 'Gold', value: '#c8a279'},
        {id: 'rose-gold', label: 'Rose gold', value: '#c9958e'},
        {id: 'deep-purple', label: 'Deep purple', value: '#332544'},
        {id: 'purple', label: 'Purple', value: '#7266a7'},
        {id: 'blue', label: 'Blue', value: '#36516a'},
        {id: 'sierra-blue', label: 'Sierra blue', value: '#6f8e9f'},
        {id: 'green', label: 'Green', value: '#506f5b'},
        {id: 'yellow', label: 'Yellow', value: '#d9c552'},
        {id: 'pink', label: 'Pink', value: '#d89cae'},
        {id: 'coral', label: 'Coral', value: '#e47e67'},
        {id: 'red', label: 'Product red', value: '#bd1c35'},
        {id: 'jet-black', label: 'Jet black', value: '#0b0c0e'}
    ];
    const selectedAppleCase = appleCaseColors.find(colour => colour.id === appleCaseColor) ?? appleCaseColors[0];

    const handleManufacturerChange = (nextManufacturer: DeviceManufacturer) => {
        setManufacturerId(nextManufacturer);
        setDeviceId(getDefaultModelForManufacturer(nextManufacturer).id);
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
        setThreeDRotation({x: Math.max(-18, Math.min(18, drag.rotationX - (event.clientY - drag.y) * .12)), y: Math.max(-28, Math.min(28, drag.rotationY + (event.clientX - drag.x) * .12))});
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

    return <main className={`stage fullBleed${isDarkMode ? ' dark' : ''}`}>
        <style>{`.stage.fullBleed,.stage.fullBleed:has(.devicePreviewArea){padding:0!important}.stage.fullBleed:not(.dark){background:radial-gradient(ellipse at 8% 12%,#fff5c6 0 9%,transparent 30%),radial-gradient(ellipse at 87% 12%,#c59bff 0 9%,transparent 34%),radial-gradient(ellipse at 84% 88%,#ff9a66 0 10%,transparent 34%),radial-gradient(ellipse at 19% 78%,#53cae8 0 10%,transparent 32%),linear-gradient(145deg,#ff9cad 0%,#f7b4d0 32%,#bd9ff4 62%,#69cbea 100%)!important}.stage.fullBleed .presentationMenu{width:100%!important;padding:0!important;background:#090909cf!important;border-color:#ffffff1d!important}.stage.fullBleed .presentationMenu .themeToggle,.stage.fullBleed .presentationMenu .deviceToggle,.stage.fullBleed .presentationMenu .threeDToggle,.stage.fullBleed .presentationMenu .orientationToggle,.stage.fullBleed .presentationMenu .manufacturerSelect,.stage.fullBleed .presentationMenu .deviceSelect,.stage.fullBleed .presentationMenu .caseSelect{background:#ffffff16!important;border-color:#ffffff2e!important;color:#fff!important}.stage.fullBleed .presentationMenu .themeToggle .fa-solid,.stage.fullBleed .presentationMenu .deviceToggle .fa-solid,.stage.fullBleed .presentationMenu .threeDToggle .fa-solid,.stage.fullBleed .presentationMenu .orientationToggle .fa-solid,.stage.fullBleed .presentationMenu .manufacturerSelect .fa-solid,.stage.fullBleed .presentationMenu .deviceSelect .fa-solid,.stage.fullBleed .presentationMenu .caseSelect .fa-solid{color:#f2d07a!important}`}</style>
        <style>{`.stage.fullBleed.dark{background:radial-gradient(ellipse at 16% 19%,#9b24594d 0%,transparent 31%),radial-gradient(ellipse at 84% 17%,#5e48cc4d 0%,transparent 33%),radial-gradient(ellipse at 79% 82%,#b15b2845 0%,transparent 35%),radial-gradient(ellipse at 20% 77%,#0b88905c 0%,transparent 37%),linear-gradient(145deg,#0c101d 0%,#241326 48%,#15101d 100%)!important;isolation:isolate}.stage.fullBleed.dark:before,.stage.fullBleed.dark:after{display:none}.stage.fullBleed.dark .devicePreviewArea:before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 9% 77%,#ffba6e90 0 2px,transparent 7px),radial-gradient(circle at 16% 83%,#ff5d9d8a 0 2px,transparent 8px),radial-gradient(circle at 24% 75%,#ffd57b78 0 1px,transparent 6px),radial-gradient(circle at 74% 80%,#9d8dff85 0 2px,transparent 8px),radial-gradient(circle at 82% 70%,#ff5f9c82 0 2px,transparent 8px),radial-gradient(circle at 91% 85%,#ffd16a78 0 1px,transparent 6px),radial-gradient(ellipse at 16% 80%,#ff4d9870 0%,transparent 16%),radial-gradient(ellipse at 83% 78%,#735fff69 0%,transparent 19%);filter:blur(1px);opacity:.82}.stage.fullBleed.dark .devicePreviewArea:after{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle at 11% 80%,#ffd48a 0 1px,transparent 5px),radial-gradient(circle at 21% 73%,#ff80b2 0 1px,transparent 5px),radial-gradient(circle at 35% 86%,#f7ba69 0 1px,transparent 5px),radial-gradient(circle at 67% 76%,#c1a5ff 0 1px,transparent 5px),radial-gradient(circle at 79% 85%,#ff8ab5 0 1px,transparent 5px),radial-gradient(circle at 90% 74%,#ffcb79 0 1px,transparent 5px);filter:blur(3px);opacity:.7}`}</style>
        <style>{`.devicePreview.threeDimensional:before{display:none!important}`}</style>
        <div className="presentationMenu" aria-label="Preview controls">
            <button className="themeToggle" onClick={() => setIsDarkMode(value => !value)} aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}><Icon name={isDarkMode ? 'fa-sun' : 'fa-moon'}/><span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span></button>
            <button className="deviceToggle" disabled={showDevice && !isDeviceAppOpen} style={showDevice && !isDeviceAppOpen ? {opacity: .38, cursor: 'not-allowed'} : undefined} onClick={() => setShowDevice(value => !value)} aria-label={`${showDevice ? 'Hide' : 'Show'} device preview`}><Icon name={showDevice ? 'fa-mobile-screen-button' : 'fa-expand'}/><span>{showDevice ? 'Hide preview' : 'Device preview'}</span></button>
            <button className="threeDToggle" onClick={() => setIsThreeDimensional(value => !value)} aria-pressed={isThreeDimensional} aria-label={`${isThreeDimensional ? 'Disable' : 'Enable'} 3D view`}><Icon name="fa-cube"/><span>3D view</span></button>
            <button className="orientationToggle" onClick={() => setIsLandscape(value => !value)} aria-label={`Switch to ${isLandscape ? 'portrait' : 'landscape'} orientation`}><Icon name="fa-rotate"/><span>{isLandscape ? 'Landscape' : 'Portrait'}</span></button>
            <label className="manufacturerSelect"><Icon name="fa-industry"/><select value={manufacturerId} onChange={event => handleManufacturerChange(event.target.value as DeviceManufacturer)} aria-label="Device manufacturer">{manufacturers.map(manufacturer => <option key={manufacturer.id} value={manufacturer.id}>{manufacturer.label}</option>)}</select></label>
            <label className="deviceSelect"><Icon name="fa-tablet-screen-button"/><select value={device.id} onChange={event => setDeviceId(event.target.value)} aria-label="Device model">{models.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
            {manufacturerId === 'apple' && <label className="caseSelect"><span style={{width: 10, height: 10, borderRadius: '50%', background: selectedAppleCase.value, boxShadow: '0 0 0 1px #fff5'}}/><select value={appleCaseColor} onChange={event => setAppleCaseColor(event.target.value)} aria-label="Apple case colour">{appleCaseColors.map(colour => <option key={colour.id} value={colour.id}>{colour.label}</option>)}</select></label>}
        </div>
        <div ref={previewAreaRef} className={`devicePreviewArea${isThreeDimensional ? ' threeDimensional' : ''}`} style={{display: showDevice ? undefined : 'none'}}>
            <div className={`devicePreview${isLandscape ? ' landscape' : ''}${isThreeDimensional ? ' threeDimensional' : ''}`} style={{width: layoutWidth * previewScale, height: layoutHeight * previewScale, '--three-d-x': `${threeDRotation.x}deg`, '--three-d-y': `${threeDRotation.y}deg`} as CSSProperties} onPointerDown={startThreeDDrag} onPointerMove={moveThreeDDrag} onPointerUp={endThreeDDrag} onPointerCancel={endThreeDDrag}>
                {device.platform === 'android' ? <AndroidContainer className={orientationClass} isDark={isDarkMode} isLandscape={isLandscape} isThreeD={isThreeDimensional} device={previewDevice} apps={previewApps} dockApps={androidDockApps}/>
                    : <IphoneContainer className={orientationClass} isDark={isDarkMode} isLandscape={isLandscape} isThreeD={isThreeDimensional} device={previewDevice} caseColor={selectedAppleCase.value} apps={previewApps} dockApps={iosDockApps} onAppOpenChange={setIsDeviceAppOpen}/>} 
            </div>
        </div>
        {!showDevice && <section style={{gridColumn: 1, gridRow: 2, minHeight: 0, overflow: 'hidden'}}>{app}</section>}
    </main>;
}
