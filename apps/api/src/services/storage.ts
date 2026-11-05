import { Storage } from '@google-cloud/storage';

export interface ObjectStore {
  list(prefix: string): Promise<string[]>;
  deletePrefix(prefix: string): Promise<void>;
}

export function gcsStore(bucketName: string): ObjectStore {
  const bucket = new Storage().bucket(bucketName);
  return {
    async list(prefix) {
      const [files] = await bucket.getFiles({ prefix });
      return files.map((f) => f.name);
    },
    async deletePrefix(prefix) {
      await bucket.deleteFiles({ prefix, force: true });
    },
  };
}

export function memoryStore(initial: string[] = []): ObjectStore & { objects: Set<string> } {
  const objects = new Set(initial);
  return {
    objects,
    list: (prefix) => Promise.resolve([...objects].filter((o) => o.startsWith(prefix)).sort()),
    deletePrefix(prefix) {
      for (const o of [...objects]) if (o.startsWith(prefix)) objects.delete(o);
      return Promise.resolve();
    },
  };
}
