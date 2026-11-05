import type { FastifyReply, FastifyRequest } from 'fastify';
import type { IdentityProvider } from '../services/firebase';

declare module 'fastify' {
  interface FastifyRequest {
    uid: string;
    userEmail: string | null;
  }
}

/** onRequest hook: requires a valid Firebase ID token in `Authorization: Bearer <token>`. */
export function requireAuth(identity: IdentityProvider) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) return void reply.code(401).send({ error: 'unauthorized' });
    try {
      const user = await identity.verifyIdToken(token);
      request.uid = user.uid;
      request.userEmail = user.email;
    } catch {
      return void reply.code(401).send({ error: 'unauthorized' });
    }
  };
}
