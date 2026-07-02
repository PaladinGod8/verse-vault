/**
 * @role DB API method registry
 * @owns Runtime inventory of window.db method names grouped by namespace
 * @seam Stable shared contract source for preload, docs, and contract guard tests
 * @calls Imports relationship method registry and exports method map constants
 */
import { DB_API_RELATIONSHIP_METHODS } from './dbApiRelationships';

export const DB_API_METHODS = {
  verses: ['getAll', 'add', 'update', 'delete'],
  worlds: ['getAll', 'getById', 'add', 'update', 'delete', 'markViewed', 'importImage'],
  levels: ['getAllByWorld', 'getById', 'add', 'update', 'delete'],
  abilities: [
    'getAllByWorld',
    'getById',
    'add',
    'update',
    'delete',
    'addChild',
    'removeChild',
    'getChildren',
  ],
  campaigns: ['getAllByWorld', 'getById', 'add', 'update', 'delete'],
  campaignNotes: ['getAllByCampaign', 'getById', 'add', 'update', 'delete', 'getAllTagsByCampaign'],
  battlemaps: ['getAllByWorld', 'getById', 'add', 'update', 'delete'],
  tokens: [
    'getAllByWorld',
    'getAllByCampaign',
    'getById',
    'importImage',
    'add',
    'update',
    'moveToWorld',
    'moveToCampaign',
    'delete',
  ],
  arcs: ['getAllByCampaign', 'getById', 'add', 'update', 'delete'],
  acts: ['getAllByArc', 'getAllByCampaign', 'getById', 'add', 'update', 'delete', 'moveTo'],
  sessions: ['getAllByCampaign', 'getAllByAct', 'getById', 'add', 'update', 'delete', 'moveTo'],
  scenes: ['getAllByCampaign', 'getAllBySession', 'getById', 'add', 'update', 'delete', 'moveTo'],
  statblocks: [
    'getAllByWorld',
    'getAllByCampaign',
    'getById',
    'add',
    'update',
    'delete',
    'linkToken',
    'unlinkToken',
    'getLinkedTokens',
    'getLinkedStatblock',
    'attachAbility',
    'detachAbility',
    'listAbilities',
  ],
  characters: [
    'getAllByWorld',
    'getById',
    'add',
    'update',
    'delete',
    'importImage',
    'searchByWorld',
    'markViewed',
  ],
  backgrounds: ['getAllByWorld', 'getById', 'add', 'update', 'delete', 'importImage', 'markViewed'],
  items: ['getAllByWorld', 'getById', 'add', 'update', 'delete', 'importImage', 'markViewed'],
  loreNotes: [
    'getAllByWorld',
    'getById',
    'add',
    'update',
    'delete',
    'importImage',
    'markViewed',
    'getAllTagsByWorld',
  ],
  factions: ['getAllByWorld', 'getById', 'add', 'update', 'delete', 'importImage', 'markViewed'],
  factionTypes: ['getAllByWorld', 'add', 'rename', 'delete'],
  factionMembers: [
    'getAllByFaction',
    'getAllByCharacter',
    'getAllPrimaryByWorld',
    'setForFaction',
    'setPrimary',
  ],
  ...DB_API_RELATIONSHIP_METHODS,
  settings: ['get', 'update'],
} as const;

export type { DbApi } from './dbApiShape';
