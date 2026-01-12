// Central base path for static assets when deployed under a subpath (e.g., /skyaetherius)
export const BASE_PATH = '/skyaetherius';

// Expose globally for non-module places (index.html inline scripts, etc.)
if (typeof window !== 'undefined') {
  (window as any).APP_BASE_PATH = (window as any).APP_BASE_PATH || BASE_PATH;
}

export default BASE_PATH;
