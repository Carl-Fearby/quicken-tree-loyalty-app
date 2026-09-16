'use client';

import {useState} from 'react';

type ManagedContent = {version: string; updatedAt: string; data: {menu: {outOfStockItems: string[]; menuItems: Record<string, {items: [string, string, string][]}[]>}}};

export default function ContentAdminPage() {
    const [token, setToken] = useState('');
    const [content, setContent] = useState<ManagedContent | null>(null);
    const [message, setMessage] = useState('Enter the admin token configured in Netlify to load live content.');
    const request = async (method: 'GET' | 'PUT', body?: unknown) => {
        const response = await fetch('/api/content-admin', {method, headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'}, body: body ? JSON.stringify(body) : undefined});
        if (!response.ok) throw new Error(response.status === 401 ? 'The admin token was not accepted.' : await response.text());
        return response.json() as Promise<ManagedContent>;
    };
    const load = async () => { try { const next = await request('GET'); setContent(next); setMessage(`Live version ${next.version} loaded.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load content.'); } };
    const toggleOutOfStock = (name: string) => setContent(current => current ? {...current, data: {...current.data, menu: {...current.data.menu, outOfStockItems: current.data.menu.outOfStockItems.includes(name) ? current.data.menu.outOfStockItems.filter(item => item !== name) : [...current.data.menu.outOfStockItems, name]}}} : current);
    const save = async () => { if (!content) return; try { const next = await request('PUT', {version: content.version, data: content.data}); setContent(next); setMessage(`Saved ${next.version}. Devices will download it on their next content check.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save content.'); } };
    const items = content ? Object.values(content.data.menu.menuItems).flatMap(section => section.flatMap(group => group.items)).map(([name]) => name) : [];
    return <main className="contentAdmin"><header><p>THE QUICKEN TREE</p><h1>Content manager</h1><span>{content ? `Version ${content.version} · ${new Date(content.updatedAt).toLocaleString('en-GB')}` : 'Not connected'}</span></header><section className="adminAccess"><label>Admin token<input type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="Configured CONTENT_ADMIN_TOKEN"/></label><button onClick={load}>Load live content</button></section><p className="adminMessage" role="status">{message}</p>{content && <section className="adminPanel"><div><p>MENU AVAILABILITY</p><h2>Out of stock</h2><span>Select an item to mark it unavailable in the app.</span></div><div className="adminItems">{items.map(name => <label key={name}><input type="checkbox" checked={content.data.menu.outOfStockItems.includes(name)} onChange={() => toggleOutOfStock(name)}/><span>{name}</span></label>)}</div><button className="adminSave" onClick={save}>Publish new content version</button></section>}<footer>Phase one: versioned content delivery and menu availability. Add authentication/roles before sharing this page with staff.</footer></main>;
}
