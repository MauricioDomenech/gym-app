import { emptyTrainingData } from './trainingStorage.js';
import type { TrainingRemoteEnvelope } from './trainingSync.js';

// Only the last server-confirmed response lives in memory while the app is open.
// Each page load must obtain it from the database before rendering records.
let confirmed: TrainingRemoteEnvelope | null = null;

export const trainingSnapshot = (): TrainingRemoteEnvelope => {
  if (!confirmed) throw new Error('Todavía no se consultaron los registros de tu cuenta.');
  return structuredClone(confirmed);
};

export const acceptTrainingResponse = (remote: TrainingRemoteEnvelope | null) => {
  confirmed = remote ? structuredClone(remote) : { schemaVersion: 1, revision: 0, data: emptyTrainingData() };
};

export const clearTrainingResponse = () => { confirmed = null; };

// One-time removal of the retired browser persistence, never an import or backup.
export const removeLegacyTrainingCopies = () => {
  for (const storage of [localStorage, sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
    for (const key of keys) {
      if (key === 'gym-app:training:v1' || key === 'gym-app:training-sync:v1' ||
          key === 'gym-app:training-owner:v1' || key?.startsWith('gym-app:training-backup:')) {
        storage.removeItem(key);
      }
    }
  }
};
