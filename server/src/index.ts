import Fastify, {type FastifyReply, type FastifyRequest} from 'fastify';
import {z} from 'zod';
import {config} from './config';
import {currentContent, publishContent} from './content';

const app = Fastify({logger: true});
app.addHook('onRequest', async (_request, reply) => {
    if (config.CORS_ORIGIN) reply.header('Access-Control-Allow-Origin', config.CORS_ORIGIN).header('Vary', 'Origin');
    reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type').header('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
});
app.options('*', async (_request, reply) => reply.code(204).send());
const auth = async (request: FastifyRequest, reply: FastifyReply) => {
    if (request.headers.authorization !== `Bearer ${config.API_ADMIN_TOKEN}`) return reply.code(401).send({message: 'Unauthorised'});
};

app.get('/health', async () => ({ok: true}));
app.get('/content', async request => {
    const query = z.object({version: z.string().optional()}).parse(request.query);
    const content = await currentContent();
    if (!content) return {statusCode: 503, message: 'Content has not been published yet.'};
    return query.version === content.version ? {version: content.version, updatedAt: content.updatedAt, changed: false} : {...content, changed: true};
});
app.get('/content-admin', {preHandler: auth}, async () => {
    const content = await currentContent();
    if (!content) return {statusCode: 503, message: 'Content has not been published yet.'};
    return content;
});
app.put('/content-admin', {preHandler: auth}, async request => {
    const body = z.object({version: z.string().optional(), data: z.record(z.string(), z.unknown())}).parse(request.body);
    return publishContent(body.data, body.version);
});

app.listen({port: config.PORT, host: '0.0.0.0'});
