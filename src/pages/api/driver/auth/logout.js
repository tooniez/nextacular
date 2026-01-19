import { clearDriverSessionCookie } from '@/lib/server/driver-session';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ errors: { error: { msg: `${req.method} method unsupported` } } });
  }

  clearDriverSessionCookie(res, req);
  return res.status(200).json({ data: { ok: true } });
}

