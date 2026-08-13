import { SignJWT, jwtVerify } from 'jose';

function getKey(secret) {
  return new TextEncoder().encode(secret);
}

export async function signToken(payload, secret) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(getKey(secret));
}

export async function requireAuth(c, next) {
  const header = c.req.header('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : c.req.query('token') || null;
  if (!token) return c.json({ error: 'Not authenticated' }, 401);

  try {
    const { payload } = await jwtVerify(token, getKey(c.env.JWT_SECRET));
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired session' }, 401);
  }
}

export async function requireAdmin(c, next) {
  return requireAuth(c, async () => {
    const user = c.get('user');
    if (user.role !== 'admin') return c.json({ error: 'Admin access required' }, 403);
    await next();
  });
}
