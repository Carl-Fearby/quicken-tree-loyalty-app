'use client';

import Dexie, {type EntityTable} from 'dexie';

export type CachedContent = {key: string; version: string; updatedAt: string; data: unknown};
export type CachedEntity = {key: string; type: string; id: string; updatedAt: string; data: unknown};
export type OfflineRequest = {id?: number; method: 'POST' | 'PATCH' | 'PUT' | 'DELETE'; path: string; body?: unknown; createdAt: string; attempts: number; lastError?: string};
export type LocalMetadata = {key: string; value: unknown};

class PaceTenantDatabase extends Dexie {
    content!: EntityTable<CachedContent, 'key'>;
    entities!: EntityTable<CachedEntity, 'key'>;
    outbox!: EntityTable<OfflineRequest, 'id'>;
    metadata!: EntityTable<LocalMetadata, 'key'>;

    constructor() {
        super('quicken-tree');
        this.version(1).stores({content: 'key, version, updatedAt', entities: 'key, type, id, updatedAt', outbox: '++id, createdAt, method, path', metadata: 'key'});
    }
}

export const localDb = new PaceTenantDatabase();

export async function cacheEntity(type: string, id: string, data: unknown, updatedAt = new Date().toISOString()) {
    await localDb.entities.put({key: `${type}:${id}`, type, id, data, updatedAt});
}

export async function readEntity<T>(type: string, id: string) {
    return (await localDb.entities.get(`${type}:${id}`))?.data as T | undefined;
}

export async function queueOfflineRequest(request: Omit<OfflineRequest, 'id' | 'createdAt' | 'attempts'>) {
    return localDb.outbox.add({...request, createdAt: new Date().toISOString(), attempts: 0});
}
