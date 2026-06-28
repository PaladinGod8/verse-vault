// Inline payload/result shapes used only by DbApi method signatures, kept out of
// dbApi.ts to stay within the file-size budget enforced by .eslintrc.cjs.
import type { FactionMember } from './domainTypes';

type RichEntityUpsertPayload = {
  profile?: string | null;
  image_src?: string | null;
  sections?: string;
  wiki_summary?: string;
};

export type CharacterUpsertPayload = RichEntityUpsertPayload & {
  name?: string;
  author?: string | null;
};

export type FactionUpsertPayload = RichEntityUpsertPayload & {
  type_id?: number | null;
  parent_faction_id?: number | null;
};

export type FactionMemberInput = { character_id: number; role: string; };
export type FactionMembershipByFaction = FactionMember & { character_name: string; };
export type FactionMembershipByCharacter = FactionMember & { faction_name: string; };
export type PrimaryFactionMembership = { character_id: number; faction_id: number; };
export type RosterReplaceResult = { faction_id: number; };
