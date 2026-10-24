/**
 * Dynamically retrieves the current application host/domain.
 * Supports Vercel domains, custom production domains, localhost, and optional .env overrides.
 */
export const getAppDomain = () => {
  if (typeof window !== 'undefined' && window.location) {
    if (import.meta.env.VITE_PUBLIC_DOMAIN) {
      return import.meta.env.VITE_PUBLIC_DOMAIN;
    }
    return window.location.host;
  }
  return 'ecukur.id';
};
