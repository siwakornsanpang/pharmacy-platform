import type { ContentImageSource } from '@pharmacy/contracts/content';
import type { Database } from '../../db/client';
import type { createAccessService } from '../access/service';
import type { MediaLifecycle, UploadIntentService } from '../media';
/** Access remains the current DB-backed authority. JSON writes consume Media when injected; isolated tests without Media keep the 503 hold. */
export interface ContentDependencies {
  db: Database;
  config?: { contentImageSources: ContentImageSource[]; supabaseUrl?: string };
  clock: () => Date;
  access: Pick<ReturnType<typeof createAccessService>, 'requireCapability' | 'resolveStaffActor'>;
  media?: MediaLifecycle;
  uploads?: UploadIntentService;
}
