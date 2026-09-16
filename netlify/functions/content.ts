import type {Context} from '@netlify/functions';
import {getContent} from '../lib/content';

export default async (request: Request, _context: Context) => {
    if (request.method !== 'GET') return new Response('Method not allowed', {status: 405});
    const content = await getContent();
    const version = new URL(request.url).searchParams.get('version');
    const changed = version !== content.version;
    return Response.json(changed ? {version: content.version, updatedAt: content.updatedAt, changed: true, data: content.data} : {version: content.version, updatedAt: content.updatedAt, changed: false}, {
        headers: {'Cache-Control': 'no-store'}
    });
};
