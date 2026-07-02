// The characterRelationships/factionRelationships slice of DbApi, split out of
// dbApi.ts to stay within the file-size budget enforced by .eslintrc.cjs.
import type {
  CharacterRelationshipInput,
  CharacterRelationshipUpdateInput,
  CharacterRelationshipView,
  FactionRelationshipInput,
  FactionRelationshipUpdateInput,
  FactionRelationshipView,
} from './dbApiPayloads';
import type { CharacterRelationship, FactionRelationship } from './domainTypes';

export const DB_API_RELATIONSHIP_METHODS = {
  characterRelationships: ['getAllByCharacter', 'add', 'update', 'delete'],
  factionRelationships: ['getAllByFaction', 'add', 'update', 'delete'],
} as const;

export interface DbApiRelationships {
  characterRelationships: {
    getAllByCharacter(characterId: number): Promise<CharacterRelationshipView[]>;
    add(data: CharacterRelationshipInput): Promise<CharacterRelationship>;
    update(id: number, data: CharacterRelationshipUpdateInput): Promise<CharacterRelationship>;
    delete(id: number): Promise<{ id: number; }>;
  };
  factionRelationships: {
    getAllByFaction(factionId: number): Promise<FactionRelationshipView[]>;
    add(data: FactionRelationshipInput): Promise<FactionRelationship>;
    update(id: number, data: FactionRelationshipUpdateInput): Promise<FactionRelationship>;
    delete(id: number): Promise<{ id: number; }>;
  };
}
