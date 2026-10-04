import type { VercelRequest } from '@vercel/node';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class TrainingAuthUnavailableError extends Error {
  constructor() {
    super('training authentication unavailable');
    this.name = 'TrainingAuthUnavailableError';
  }
}

/** Verify with Supabase Auth, never decode an unverified JWT as identity. */
export const authenticateTrainingOwner = async (
  req: VercelRequest,
  fetcher: typeof fetch = fetch,
): Promise<string | null> => {
  const base = process.env.COACH_TRAINING_DB_URL;
  const key = process.env.COACH_AUTH_PUBLIC_KEY;
  const owner = process.env.COACH_TRAINING_OWNER_ID;
  const authorization = req.headers.authorization;
  if (!base || !key || !owner || !UUID.test(owner) ||
      typeof authorization !== 'string' || !/^Bearer [^\s]+$/.test(authorization)) return null;
  try {
    const url = new URL(base);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null;
    url.pathname = '/auth/v1/user';
    const response = await fetcher(url.toString(), {
      headers: { apikey: key, Authorization: authorization },
      signal: AbortSignal.timeout(10_000),
      redirect: 'error',
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new TrainingAuthUnavailableError();
    const user: unknown = await response.json();
    return user && typeof user === 'object' && 'id' in user && user.id === owner ? owner : null;
  } catch {
    throw new TrainingAuthUnavailableError();
  }
};
