// Inline payload/result shapes used only by DbApi method signatures, kept out of
// dbApi.ts to stay within the file-size budget enforced by .eslintrc.cjs.
import type {
  CanvasSceneData,
  Character,
  CharacterRelationship,
  FactionMember,
  FactionRelationship,
} from './domainTypes';

type RichEntityUpsertPayload = {
  profile?: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
  sections?: string;
  wiki_summary?: string;
};

export type CharacterUpsertPayload = RichEntityUpsertPayload & {
  name?: string;
  is_player_character?: number;
  owner?: string | null;
  author?: string | null;
};

export type FactionUpsertPayload = RichEntityUpsertPayload & {
  name?: string;
  type_id?: number | null;
  parent_faction_id?: number | null;
};

export type BackgroundUpsertPayload = {
  name?: string;
  description?: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
};

export type ItemUpsertPayload = {
  name?: string;
  description?: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
};

export type CampaignNoteUpsertPayload = {
  name?: string;
  tags?: string[];
  canvas_scene?: CanvasSceneData | null;
  canvas_preview_image?: string | null;
};

export type LoreNoteUpsertPayload = {
  name?: string;
  content?: string | null;
  image_src?: string | null;
  original_image_src?: string | null;
  image_crop?: string | null;
  canvas_enabled?: boolean;
  canvas_scene?: CanvasSceneData | null;
  canvas_preview_image?: string | null;
  tags?: string[];
};

export type FactionMemberInput = { character_id: number; role: string; };
export type FactionMembershipByFaction = FactionMember & { character_name: string; };
export type FactionMembershipByCharacter = FactionMember & { faction_name: string; };
export type PrimaryFactionMembership = { character_id: number; faction_id: number; };
export type RosterReplaceResult = { faction_id: number; };

export type CharacterSearchByWorldQuery = {
  worldId: number;
  query: string;
  offset: number;
  limit: number;
  excludeCharacterIds?: number[];
};
export type CharacterSearchByWorldResult = { items: Character[]; hasMore: boolean; };

export type CharacterRelationshipView = CharacterRelationship & {
  counterpart_id: number;
  counterpart_name: string;
  subject_label: string;
  counterpart_label: string;
};
export type FactionRelationshipView = FactionRelationship & {
  counterpart_id: number;
  counterpart_name: string;
  subject_label: string;
  counterpart_label: string;
};

export type CharacterRelationshipInput = {
  character_id: number;
  related_character_id: number;
  character_label: string;
  related_label: string;
};
export type FactionRelationshipInput = {
  faction_id: number;
  related_faction_id: number;
  faction_label: string;
  related_label: string;
};

export type CharacterRelationshipUpdateInput = {
  character_label?: string;
  related_label?: string;
};
export type FactionRelationshipUpdateInput = {
  faction_label?: string;
  related_label?: string;
};
