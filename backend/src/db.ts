import postgres from 'postgres';
import {config} from './config';

const usesLocalDatabase = /(?:localhost|127\.0\.0\.1)/.test(config.DATABASE_URL);
export const sql = postgres(config.DATABASE_URL, {max: 10, idle_timeout: 20, ssl: usesLocalDatabase ? false : 'require'});
