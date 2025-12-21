import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'hidey-hole-auth';
export const AUTH_COOKIE_MAX_AGE = 60 * 24 * 60 * 60; // 60 days in seconds

export async function isAuthenticated() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return !!authCookie?.value;
}

export async function getSession() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);
  return authCookie?.value ? JSON.parse(authCookie.value) : null;
}
