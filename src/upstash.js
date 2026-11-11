// Tiny Redis-over-HTTPS client for Upstash (the free Redis add-on in Vercel). Used by api/lead.js and api/digest.js.
// Env (set automatically by the integration): KV_REST_API_URL + KV_REST_API_TOKEN, or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.
const URL_ = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

/** Run one Redis command, e.g. redis(['GET', 'key']). Returns undefined when storage is not configured. */
export async function redis(cmd) {
  const url = URL_(), token = TOKEN();
  if (!url || !token) return undefined;
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('store');
  return (await r.json()).result;
}
export const storageConfigured = () => Boolean(URL_() && TOKEN());

/** Same get/put shape as a Cloudflare KV binding (what src/lead-core.js expects). */
export const leadStore = () => storageConfigured() ? {
  get: (key) => redis(['GET', key]),
  put: (key, value, opts = {}) => redis(opts.expirationTtl ? ['SET', key, value, 'EX', String(opts.expirationTtl)] : ['SET', key, value]),
} : undefined;
