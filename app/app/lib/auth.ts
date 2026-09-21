export type AuthSession = { accessToken: string; member: { id: string; email: string; name: string } };

const apiUrl = process.env.NEXT_PUBLIC_CONTENT_API_URL ?? 'http://localhost:4000';

async function request<T = AuthSession>(path: string, body?: Record<string, string>): Promise<T> {
    const response = await fetch(`${apiUrl}${path}`, {
        method: 'POST', credentials: 'include',
        headers: body ? {'Content-Type': 'application/json'} : undefined,
        body: body ? JSON.stringify(body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message ?? 'We could not complete that request.');
    return payload as T;
}

export const register = (name: string, email: string, password: string) => request('/auth/register', {
    name,
    email,
    password
});
export const login = (email: string, password: string) => request('/auth/login', {email, password});
export const refreshSession = () => request('/auth/refresh');
export const logout = () => request('/auth/logout').catch(() => undefined);
export const requestPasswordReset = (email: string) => request<{ ok: true }>('/auth/forgot-password', {email});
