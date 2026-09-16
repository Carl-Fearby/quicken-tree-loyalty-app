import {sql} from './db';

export type VersionedContent = {version: string; updatedAt: string; data: unknown};

export async function currentContent(): Promise<VersionedContent | null> {
    const [row] = await sql<{version: number; payload: unknown; published_at: Date}[]>`select version, payload, published_at from content_versions where is_current = true limit 1`;
    return row ? {version: `content-${row.version}`, updatedAt: row.published_at.toISOString(), data: row.payload} : null;
}

export async function publishContent(data: unknown, expectedVersion?: string) {
    const payload = JSON.parse(JSON.stringify(data));
    return sql.begin(async transaction => {
        const [current] = await transaction<{version: number}[]>`select version from content_versions where is_current = true for update`;
        if (expectedVersion && expectedVersion !== `content-${current?.version}`) throw new Error('This content has changed. Reload it before saving.');
        await transaction`update content_versions set is_current = false where is_current = true`;
        const [next] = await transaction<{version: number; payload: unknown; published_at: Date}[]>`insert into content_versions (payload, is_current) values (${transaction.json(payload)}, true) returning version, payload, published_at`;
        return {version: `content-${next.version}`, updatedAt: next.published_at.toISOString(), data: next.payload};
    });
}
