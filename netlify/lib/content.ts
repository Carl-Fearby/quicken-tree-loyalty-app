import {getStore} from '@netlify/blobs';
import appointments from '../../app/data/appointments.json';
import appConfig from '../../app/data/app-config.json';
import mainMenu from '../../app/data/main-menu-september.json';
import menu from '../../app/data/menu.json';
import points from '../../app/data/points-and-tier.json';
import profile from '../../app/data/profile.json';
import rewards from '../../app/data/rewards.json';

export const CONTENT_STORE = 'quicken-tree-content';
export const CONTENT_KEY = 'current';

export const seedContent = {appointments, appConfig, mainMenu, menu, points, profile, rewards};
export type AppContent = typeof seedContent;
export type VersionedContent = {version: string; updatedAt: string; data: AppContent};

const seed: VersionedContent = {
    version: 'seed-1',
    updatedAt: '2026-09-16T00:00:00.000Z',
    data: seedContent
};

export async function getContent(): Promise<VersionedContent> {
    const stored = await getStore(CONTENT_STORE).get(CONTENT_KEY, {type: 'json'}) as VersionedContent | null;
    return stored?.data ? stored : seed;
}

export async function saveContent(data: AppContent, previousVersion?: string) {
    const current = await getContent();
    if (previousVersion && previousVersion !== current.version) throw new Error('This content has changed. Reload it before saving.');
    const next: VersionedContent = {
        version: `content-${Date.now()}`,
        updatedAt: new Date().toISOString(),
        data
    };
    await getStore(CONTENT_STORE).setJSON(CONTENT_KEY, next);
    return next;
}
