'use client';

export type ContentManifest = {version: string; updatedAt: string; changed: boolean; data?: unknown};
const cacheKey = 'quicken-tree-content-cache';

export async function checkForContentUpdate() {
    const cached = window.localStorage.getItem(cacheKey);
    const previous = cached ? JSON.parse(cached) as {version?: string} : {};
    const response = await fetch(`/api/content${previous.version ? `?version=${encodeURIComponent(previous.version)}` : ''}`, {cache: 'no-store'});
    if (!response.ok) throw new Error('Content service unavailable');
    const manifest = await response.json() as ContentManifest;
    if (manifest.changed && manifest.data) window.localStorage.setItem(cacheKey, JSON.stringify({version: manifest.version, updatedAt: manifest.updatedAt, data: manifest.data}));
    return manifest;
}

export function readCachedContent<T>() {
    try { return JSON.parse(window.localStorage.getItem(cacheKey) ?? 'null') as {version: string; updatedAt: string; data: T} | null; }
    catch { return null; }
}
