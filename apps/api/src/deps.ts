import type { Db } from '@koach/db';
import type { Config } from './config';
import type { EmailSender } from './services/email-sender';
import type { IdentityProvider } from './services/firebase';
import type { ObjectStore } from './services/storage';

/** Everything the app needs from the outside world; tests pass fakes. */
export interface Deps {
  config: Config;
  db: Db;
  identity: IdentityProvider;
  storage: ObjectStore;
  email: EmailSender;
  now: () => Date;
  version: string;
}
