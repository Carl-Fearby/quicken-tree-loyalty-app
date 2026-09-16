import 'dotenv/config';
import {z} from 'zod';

const schema = z.object({
    DATABASE_URL: z.string().url(),
    API_ADMIN_TOKEN: z.string().min(24),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().url().optional()
});

export const config = schema.parse(process.env);
