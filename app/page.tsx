'use client';

import {useState} from 'react';
import {Icon} from './components/Icon';
import {IphoneContainer, type DeviceProfile, type IphoneSurfaceProps} from './components/IphoneContainer';

const deviceProfiles: DeviceProfile[] = [
    {id: 'iphone-17-pro', label: 'iPhone 17 Pro', width: 402, height: 874, cornerRadius: 50, cutout: 'island', statusTop: 20, statusInset: 28, statusSize: 16},
    {id: 'iphone-17-pro-max', label: 'iPhone 17 Pro Max', width: 440, height: 956, cornerRadius: 54, cutout: 'island', statusTop: 21, statusInset: 30, statusSize: 16},
    {id: 'ipad-pro-11-m5', label: 'iPad Pro 11″ (M5)', width: 834, height: 1210, cornerRadius: 28, cutout: 'none', scale: .58, statusTop: 22, statusInset: 30, statusSize: 16},
    {id: 'ipad-air-11-m4', label: 'iPad Air 11″ (M4)', width: 820, height: 1180, cornerRadius: 28, cutout: 'none', scale: .59, statusTop: 22, statusInset: 30, statusSize: 16},
    {id: 'ipad-mini-a17', label: 'iPad mini (A17 Pro)', width: 744, height: 1133, cornerRadius: 28, cutout: 'none', scale: .62, statusTop: 20, statusInset: 28, statusSize: 15},
    {id: 'iphone-16-pro', label: 'iPhone 16 Pro', width: 402, height: 874, cornerRadius: 50, cutout: 'island', statusTop: 20, statusInset: 28, statusSize: 16},
    {id: 'iphone-15', label: 'iPhone 15', width: 393, height: 852, cornerRadius: 48, cutout: 'island', statusTop: 20, statusInset: 28, statusSize: 16},
    {id: 'iphone-14', label: 'iPhone 14', width: 390, height: 844, cornerRadius: 48, cutout: 'notch', statusTop: 16, statusInset: 24, statusSize: 14, notchWidth: 156, notchHeight: 30},
    {id: 'iphone-13', label: 'iPhone 13', width: 390, height: 844, cornerRadius: 48, cutout: 'notch', statusTop: 16, statusInset: 24, statusSize: 14, notchWidth: 154, notchHeight: 30},
    {id: 'iphone-se', label: 'iPhone SE (3rd gen)', width: 375, height: 667, cornerRadius: 36, cutout: 'none', statusTop: 16, statusInset: 22, statusSize: 15}
];

function QuickenTreeIcon() {
    return <b style={{fontSize: 31, letterSpacing: -2, textShadow: '0 3px 8px #0008'}}>QT</b>;
}

function AppPlaceholder({dark = false, title = 'THE QUICKEN TREE', message = 'App surface placeholder', orientation = 'portrait', screen}: { dark?: boolean; title?: string; message?: string; orientation?: IphoneSurfaceProps['orientation']; screen: IphoneSurfaceProps['screen'] }) {
    return <div data-ios-orientation={orientation} style={{height: '100%', display: 'grid', placeItems: 'center', background: dark ? '#171616' : '#fafafa', color: dark ? '#f7f3ee' : '#171717', textAlign: 'center', padding: 32}}>
        <div><b style={{display: 'block', color: '#cf122d', fontSize: 14, letterSpacing: 2}}>{title}</b><p style={{margin: '10px 0 0', fontSize: 18}}>{message}</p><small style={{display: 'block', marginTop: 10, color: dark ? '#c5bcb3' : '#6d655e', fontSize: 12}}>screen.orientation: {screen.orientation.type} ({screen.orientation.angle}°)</small></div>
    </div>;
}

export default function Page() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [showIphone, setShowIphone] = useState(true);
    const [isLandscape, setIsLandscape] = useState(false);
    const [deviceId, setDeviceId] = useState('iphone-17-pro');
    const device = deviceProfiles.find(profile => profile.id === deviceId) ?? deviceProfiles[0];
    const previewScale = device.scale ?? 1;
    const renderApp = ({orientation, screen}: IphoneSurfaceProps) => <AppPlaceholder dark={isDarkMode} orientation={orientation} screen={screen}/>;
    const renderRewardsApp = ({orientation, screen}: IphoneSurfaceProps) => <AppPlaceholder dark={isDarkMode} title="QT REWARDS" message="Rewards app surface placeholder" orientation={orientation} screen={screen}/>;
    const previewSurfaceProps: IphoneSurfaceProps = {orientation: isLandscape ? 'landscape' : 'portrait', isLandscape, screen: {orientation: {type: isLandscape ? 'landscape-primary' : 'portrait-primary', angle: isLandscape ? 90 : 0}}, device};
    const app = renderApp(previewSurfaceProps);

    return <main className={`stage${isDarkMode ? ' dark' : ''}`}>
        <div className="presentationMenu" aria-label="Preview controls">
            <button className="themeToggle" onClick={() => setIsDarkMode(value => !value)} aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}><Icon name={isDarkMode ? 'fa-sun' : 'fa-moon'}/><span>{isDarkMode ? 'Light mode' : 'Dark mode'}</span></button>
            <button className="deviceToggle" onClick={() => setShowIphone(value => !value)} aria-label={`${showIphone ? 'Hide' : 'Show'} iPhone preview`}><Icon name={showIphone ? 'fa-mobile-screen-button' : 'fa-expand'}/><span>{showIphone ? 'Hide iPhone' : 'iPhone preview'}</span></button>
            <button className="orientationToggle" onClick={() => setIsLandscape(value => !value)} aria-label={`Switch to ${isLandscape ? 'portrait' : 'landscape'} orientation`}><Icon name="fa-rotate"/><span>{isLandscape ? 'Landscape' : 'Portrait'}</span></button>
            <label className="deviceSelect"><Icon name="fa-tablet-screen-button"/><select value={deviceId} onChange={event => setDeviceId(event.target.value)} aria-label="Preview device">{deviceProfiles.map(profile => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
        </div>
        {showIphone ? <div className={`devicePreview${isLandscape ? ' landscape' : ''}`} style={{width: (isLandscape ? device.height : device.width) * previewScale, height: (isLandscape ? device.width : device.height) * previewScale}}><IphoneContainer className={`iphoneOrientation${isLandscape ? ' landscape' : ''}`} isDark={isDarkMode} isLandscape={isLandscape} device={device}
            apps={[
                {id: 'quicken-tree', label: 'The Quicken Tree', icon: <QuickenTreeIcon/>, app: renderApp},
                {id: 'rewards', label: 'QT Rewards', icon: <Icon name="fa-gift"/>, app: renderRewardsApp}
            ]}
            dockApps={[<Icon key="phone" name="fa-phone"/>, <Icon key="messages" name="fa-message"/>, <Icon key="safari" name="fa-compass"/>, <Icon key="camera" name="fa-camera"/>]}/></div> : <section style={{position: 'absolute', top: 68, right: 0, bottom: 0, left: 0, overflow: 'hidden'}}>{app}</section>}
    </main>;
}
