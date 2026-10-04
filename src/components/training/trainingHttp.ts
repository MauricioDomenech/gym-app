// The login boundary installs a reader, not a copied token, so refreshes apply
// to every request. Synthetic previews deliberately leave it unset.
let readAccessToken: (() => Promise<string | null>) | null = null;

export const setTrainingAccessTokenReader = (reader: (() => Promise<string | null>) | null) => {
  readAccessToken = reader;
};

export const trainingAuthorization = async (): Promise<Record<string, string>> => {
  if (!readAccessToken) return {};
  const token = await readAccessToken();
  if (!token) throw new Error('La sesión venció. Volvé a entrar.');
  return { Authorization: `Bearer ${token}` };
};
