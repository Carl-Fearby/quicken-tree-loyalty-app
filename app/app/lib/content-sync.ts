'use client';

import {localDb, type CachedContent} from './local-db';

export type ContentManifestItem = {key: string; version: string; updatedAt: string};
export type ContentManifest = {datasets: ContentManifestItem[]};
const contentApiBase = process.env.NEXT_PUBLIC_CONTENT_API_URL ?? '/api';
const endpoint = (path: string) => `${contentApiBase.replace(/\/$/, '')}${path}`;
const dishImageCache = 'quicken-tree-dish-images-v1';

async function cacheDishImages(menu: unknown, refresh: boolean) {
    if (!('caches' in window)) return;
    const images = (menu as {dishImages?: Record<string, string>} | null)?.dishImages ?? {};
    const urls = [...new Set(Object.values(images).filter(url => url.startsWith('/dish-images/')))];
    if (!urls.length) return;
    const cache = await caches.open(dishImageCache);
    for (let index = 0; index < urls.length; index += 4) {
        await Promise.all(urls.slice(index, index + 4).map(async url => {
            if (!refresh && await cache.match(url)) return;
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Dish image download failed: ${url}`);
            await cache.put(url, response);
        }));
    }
}

/** Checks version records first, then downloads only changed datasets. */
let pending: Promise<{manifest: ContentManifest; updated: string[]}> | null = null;
export function checkForContentUpdate() {
    if (!pending) pending = syncContent().finally(() => { pending = null; });
    return pending;
}
async function syncContent() {
    const response = await fetch(endpoint('/content/manifest'), {cache: 'no-store'});
    if (!response.ok) throw new Error('Content service unavailable');
    const manifest = await response.json() as ContentManifest;
    const records: CachedContent[] = [];
    for (const item of manifest.datasets) {
        const cached = await localDb.content.get(item.key);
        if (cached?.version === item.version) continue;
        const resultResponse = await fetch(endpoint(`/content/${encodeURIComponent(item.key)}`), {cache: 'no-store'});
        if (!resultResponse.ok) throw new Error('Content download failed');
        const result = await resultResponse.json() as CachedContent;
        if (result.version !== item.version) throw new Error('Content changed during download; retry on next sync.');
        records.push({key:item.key,version:result.version,updatedAt:result.updatedAt,data:result.data});
    }
    const updatedMenu = records.find(record => record.key === 'menu');
    const menu = updatedMenu ?? await localDb.content.get('menu');
    if (menu) {
        try {
            await cacheDishImages(menu.data, Boolean(updatedMenu));
        } catch (error) {
            console.warn('Dish images could not be cached for offline use.', error);
        }
    }
    await localDb.transaction('rw',localDb.content,async()=>{
        if(records.length)await localDb.content.bulkPut(records);
        const keys=new Set(manifest.datasets.map(item=>item.key));
        await localDb.content.filter(row=>!keys.has(row.key)).delete();
    });
    if(records.length)window.dispatchEvent(new Event('quicken-content-updated'));
    return {manifest,updated:records.map(record=>record.key)};
}

export async function readCachedContent<T>(key: string) {
    return (await localDb.content.get(key))?.data as T | undefined;
}
