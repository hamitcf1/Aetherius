// Central base path for static assets when deployed under a subpath (default empty; Worker will map /skyaetherius → /)
// Use Vite's BASE_URL at runtime so built assets use the correct prefix in both dev and production
export const BASE_PATH = (import.meta as any).env?.BASE_URL || '';

// Expose globally for non-module places (index.html inline scripts, etc.)
if (typeof window !== 'undefined') {
  (window as any).APP_BASE_PATH = (window as any).APP_BASE_PATH || BASE_PATH;
}

export default BASE_PATH;
