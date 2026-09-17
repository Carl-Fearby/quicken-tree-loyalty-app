import {createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {config} from './config';

const scrypt = promisify(scryptCallback) as (password: string, salt: string, keyLength: number) => Promise<Buffer>;
const encoder = new TextEncoder();
const accessLifetimeSeconds = 15 * 60;

type AccessClaims = {sub: string; email: string; name: string; iat: number; exp: number};
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const decode = <T>(value: string) => JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
const signature = (value: string) => createHmac('sha256', config.AUTH_JWT_SECRET ?? config.API_ADMIN_TOKEN).update(value).digest('base64url');

export async function hashPassword(password: string) {
    const salt = randomBytes(16).toString('base64url');
    const hash = Buffer.from(await scrypt(password, salt, 64)).toString('base64url');
    return {salt, hash};
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
    const actual = Buffer.from(await scrypt(password, salt, 64));
    const expected = Buffer.from(expectedHash, 'base64url');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createAccessToken(member: {id: string; email: string; displayName: string}) {
    const now = Math.floor(Date.now() / 1000);
    const claims: AccessClaims = {sub: member.id, email: member.email, name: member.displayName, iat: now, exp: now + accessLifetimeSeconds};
    const body = `${encode({alg: 'HS256', typ: 'JWT'})}.${encode(claims)}`;
    return `${body}.${signature(body)}`;
}

export function verifyAccessToken(token: string): AccessClaims | null {
    const [header, payload, receivedSignature] = token.split('.');
    if (!header || !payload || !receivedSignature) return null;
    const body = `${header}.${payload}`;
    const expected = signature(body);
    if (receivedSignature.length !== expected.length || !timingSafeEqual(Buffer.from(receivedSignature), Buffer.from(expected))) return null;
    try {
        const claims = decode<AccessClaims>(payload);
        return claims.exp > Math.floor(Date.now() / 1000) && claims.sub ? claims : null;
    } catch { return null; }
}

export function createRefreshToken() { return randomBytes(48).toString('base64url'); }
export function hashRefreshToken(token: string) { return createHash('sha256').update(token).digest('base64url'); }
export function parseCookies(header?: string) {
    return Object.fromEntries((header ?? '').split(';').map(part => part.trim().split('=').map(decodeURIComponent)).filter(([key]) => key));
}
export function refreshCookie(token: string) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    return `qt_refresh=${encodeURIComponent(token)}; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}
export function expiredRefreshCookie() { return 'qt_refresh=; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=0'; }
