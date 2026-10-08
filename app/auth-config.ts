import {env} from 'cloudflare:workers';

export function authConfig() {
  const settings=env as unknown as Record<string,string|undefined>;
  const url=settings.SUPABASE_URL?.replace(/\/$/,'');
  const key=settings.SUPABASE_PUBLISHABLE_KEY;
  // shortcut: hosted Supabase URLs and publishable keys only, extend for self-hosted auth if needed.
  if(!url||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||!key?.startsWith('sb_publishable_'))return null;
  return {url,key,google:settings.SUPABASE_GOOGLE_ENABLED==='true'};
}
