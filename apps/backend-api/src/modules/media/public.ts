import { CAPABILITY, type PermissionKey } from '@pharmacy/contracts/access';
import type { AssetKind, AssetOwner } from '@pharmacy/contracts/media';
import type { StaffActor } from '../access/service';
import type { RegistryPort } from '../registry';
import { visibilityFor } from './policy';
import type { MediaOwnerAuthorizer, VerifiedUploadActor } from './types';

function staffCan(actor: StaffActor | null, capability: PermissionKey): actor is StaffActor {
  return !!actor && actor.permissions.includes(capability);
}

export function staffDomainAuthorizer(capability: PermissionKey): MediaOwnerAuthorizer {
  return {
    async authorizeUpload(_owner: AssetOwner, _kind: AssetKind, actor: VerifiedUploadActor) {
      return actor.kind === 'staff' && actor.requiredCapability === capability;
    },
    async authorizeDownload({ visibility, actor }) {
      if (visibility === 'public') {
        return actor ? { assetId: '', owner: { domain: 'content', type: '', id: '', slot: '' }, actorKey: `staff:${actor.id}` } : {
          assetId: '', owner: { domain: 'content', type: '', id: '', slot: '' }, actorKey: 'public',
        };
      }
      if (!staffCan(actor, capability)) return null;
      return { assetId: '', owner: { domain: 'content', type: '', id: '', slot: '' }, actorKey: `staff:${actor.id}` };
    },
  };
}

function withAsset(
  assetId: string,
  owner: AssetOwner,
  actorKey: string,
): NonNullable<Awaited<ReturnType<MediaOwnerAuthorizer['authorizeDownload']>>> {
  return { assetId, owner, actorKey };
}

const contentUploadCapability: Record<string, PermissionKey> = {
  news: CAPABILITY.MANAGE_NEWS, medicine: CAPABILITY.MANAGE_NEWS, 'public-project': CAPABILITY.MANAGE_NEWS,
  products: CAPABILITY.MANAGE_PRODUCT,
  'home-content': CAPABILITY.MANAGE_HOME, 'pharmacist-home-content': CAPABILITY.MANAGE_HOME,
  laws: CAPABILITY.MANAGE_LAW, council: CAPABILITY.MANAGE_ABOUT, history: CAPABILITY.MANAGE_ABOUT,
  agencies: CAPABILITY.MANAGE_AGENCY, 'web-settings': CAPABILITY.MANAGE_WEB_SETTINGS,
  honor: CAPABILITY.MANAGE_ABOUT, services: CAPABILITY.MANAGE_SERVICE,
  'policy-projects': CAPABILITY.MANAGE_ABOUT, 'other-service-items': CAPABILITY.MANAGE_OTHER_SERVICE,
};

export function createMediaAuthorizers(registry: Pick<RegistryPort, 'getPhotoOwnerReference'>): Record<AssetOwner['domain'], MediaOwnerAuthorizer> {
  const content = staffDomainAuthorizer(CAPABILITY.MANAGE_NEWS);
  const requests = staffDomainAuthorizer(CAPABILITY.MANAGE_REGISTER);
  return {
    content: {
      async authorizeUpload(owner, _kind, actor) {
        if (actor.kind !== 'staff') return false;
        const required = contentUploadCapability[owner.type];
        return required !== undefined && actor.requiredCapability === required;
      },
      async authorizeDownload(input) {
        const decision = await content.authorizeDownload(input);
        return decision ? withAsset(input.assetId, input.owner, decision.actorKey) : null;
      },
    },
    requests: {
      async authorizeUpload(owner, kind, actor) {
        return requests.authorizeUpload(owner, kind, actor);
      },
      async authorizeDownload(input) {
        const decision = await requests.authorizeDownload(input);
        return decision ? withAsset(input.assetId, input.owner, decision.actorKey) : null;
      },
    },
    academy: {
      async authorizeUpload() { return false; },
      async authorizeDownload() { return null; },
    },
    registry: {
      // Photos already stored can still be read. New uploads stay closed.
      async authorizeUpload() { return false; },
      async authorizeDownload(input) {
        if (input.kind !== 'website-image' || input.owner.type !== 'pharmacist') return null;
        const id = Number(input.owner.id);
        if (!Number.isSafeInteger(id)) return null;
        const photo = await registry.getPhotoOwnerReference(id, 'website-image');
        if (!photo.ownerExists || !photo.authorized) return null;
        if (visibilityFor(input.kind) === 'public')
          return withAsset(input.assetId, input.owner, input.actor ? `staff:${input.actor.id}` : 'public');
        if (!staffCan(input.actor, CAPABILITY.MANAGE_REGISTER)) return null;
        return withAsset(input.assetId, input.owner, `staff:${input.actor.id}`);
      },
    },
  };
}
