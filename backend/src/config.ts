import 'dotenv/config';
import {z} from 'zod';

const schema = z.object({
    DATABASE_URL: z.string().url(),
    API_ADMIN_TOKEN: z.string().min(24),
    AUTH_JWT_SECRET: z.string().min(32).optional(),
    MAILTRAP_API_KEY: z.string().min(1).optional(),
    MAIL_FROM_ADDRESS: z.string().email().optional(),
    MAIL_TO_ADDRESS: z.string().email().optional(),
    MAIL_FROM_NAME: z.string().min(1).default('The Quicken Tree'),
    VENUE_NAME: z.string().min(1).default('The Quicken Tree'),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    PORT: z.coerce.number().int().positive().default(4000),
    HOST: z.string().default('0.0.0.0'),
    CORS_ORIGIN: z.string().optional()
});

export const config = schema.parse(process.env);
