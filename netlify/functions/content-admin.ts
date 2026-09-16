import type {Context} from '@netlify/functions';
import {getContent, saveContent, type AppContent} from '../lib/content';

const authorised = (request: Request) => {
    const token = process.env.CONTENT_ADMIN_TOKEN;
    return Boolean(token && request.headers.get('authorization') === `Bearer ${token}`);
};

export default async (request: Request, _context: Context) => {
    if (!authorised(request)) return new Response('Unauthorised', {status: 401});
    if (request.method === 'GET') return Response.json(await getContent(), {headers: {'Cache-Control': 'no-store'}});
    if (request.method !== 'PUT') return new Response('Method not allowed', {status: 405});
    try {
        const body = await request.json() as {version?: string; data?: AppContent};
        if (!body.data?.menu || !body.data?.appointments || !body.data?.profile) return new Response('Invalid content payload', {status: 400});
        return Response.json(await saveContent(body.data, body.version));
    } catch (error) {
        return new Response(error instanceof Error ? error.message : 'Could not save content', {status: 409});
    }
};
