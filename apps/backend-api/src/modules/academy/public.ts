import type { AcademyMemberActor } from '@pharmacy/contracts/academy';
import type { Database } from '../../db/client';
import type { BackendConfig } from '../../config/server';
import type { createAccessService } from '../access/service';
import type { MediaLifecycle, MediaService, UploadIntentService } from '../media';

export type { AcademyMemberActor };

export interface AcademyDependencies {
  db: Database;
  config: BackendConfig;
  clock: () => Date;
  access: Pick<ReturnType<typeof createAccessService>, 'requireCapability' | 'resolveStaffActor'>;
  media?: MediaLifecycle;
  uploads?: UploadIntentService;
  downloads?: Pick<MediaService, 'issuePrivateDownload'>;
}

export class AcademyError extends Error {
  constructor(public readonly statusCode: 400 | 401 | 403 | 404 | 409 | 503, message: string) {
    super(message);
  }
}
