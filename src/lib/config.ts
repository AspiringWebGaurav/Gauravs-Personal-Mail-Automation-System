/**
 * Application URL Configuration
 * Dynamically resolves between local development and production custom domain.
 */
export const APP_URL: string =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === 'production' ? 'https://gpmas.eu.cc' : 'http://localhost:3000');

/**
 * Returns a fully qualified URL for a given path.
 */
export function getAppUrl(path: string = ''): string {
    const base = APP_URL.replace(/\/$/, '');
    if (!path) return base;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
}
