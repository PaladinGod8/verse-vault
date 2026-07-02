/**
 * @role Ambient type adapter
 * @owns Global compatibility aliases and Window.db ambient declarations
 * @seam Renderer TypeScript ambient bridge to the shared contract modules
 * @calls Shared contract type modules and Forge/Vite ambient declarations
 */
import type * as DomainTypes from './src/shared/contracts/domainTypes';
import type * as SettingsTypes from './src/shared/contracts/settingsTypes';

export {};

declare global {
  type Verse = DomainTypes.Verse;
  type World = DomainTypes.World;
  type Level = DomainTypes.Level;
  type Ability = DomainTypes.Ability;
  type AbilityChild = DomainTypes.AbilityChild;
  type Campaign = DomainTypes.Campaign;
  type BattleMap = DomainTypes.BattleMap;
  type BattleMapGridMode = DomainTypes.BattleMapGridMode;
  type BattleMapRuntimeGridConfig = DomainTypes.BattleMapRuntimeGridConfig;
  type BattleMapRuntimeMapConfig = DomainTypes.BattleMapRuntimeMapConfig;
  type BattleMapRuntimeCameraConfig = DomainTypes.BattleMapRuntimeCameraConfig;
  type BattleMapRuntimeConfig = DomainTypes.BattleMapRuntimeConfig;
  type BattleMapConfig = DomainTypes.BattleMapConfig;
  type ScenePayloadRuntime = DomainTypes.ScenePayloadRuntime;
  type ScenePayload = DomainTypes.ScenePayload;
  type TokenImageImportPayload = DomainTypes.TokenImageImportPayload;
  type TokenImageImportResult = DomainTypes.TokenImageImportResult;
  type TokenGridType = DomainTypes.TokenGridType;
  type TokenSquareFootprintCell = DomainTypes.TokenSquareFootprintCell;
  type TokenHexFootprintCell = DomainTypes.TokenHexFootprintCell;
  type TokenFootprintConfig = DomainTypes.TokenFootprintConfig;
  type TokenFramingConfig = DomainTypes.TokenFramingConfig;
  type TokenConfigShape = DomainTypes.TokenConfigShape;
  type Token = DomainTypes.Token;
  type Arc = DomainTypes.Arc;
  type Act = DomainTypes.Act;
  type Session = DomainTypes.Session;
  type Scene = DomainTypes.Scene;
  type CampaignSceneListItem = DomainTypes.CampaignSceneListItem;
  type StatBlockTokenLink = DomainTypes.StatBlockTokenLink;
  type StatBlockAbilityAssignment = DomainTypes.StatBlockAbilityAssignment;
  type StatBlockSkillValue = DomainTypes.StatBlockSkillValue;
  type StatBlockConfig = DomainTypes.StatBlockConfig;
  type StatBlock = DomainTypes.StatBlock;
  type Character = DomainTypes.Character;
  type Background = DomainTypes.Background;
  type Item = DomainTypes.Item;
  type Faction = DomainTypes.Faction;
  type FactionType = DomainTypes.FactionType;
  type FactionMember = DomainTypes.FactionMember;
  type CharacterRelationship = DomainTypes.CharacterRelationship;
  type FactionRelationship = DomainTypes.FactionRelationship;
  type AppSettings = DomainTypes.AppSettings;
  type AppThemePreference = SettingsTypes.AppThemePreference;
  type AppCardSize = SettingsTypes.AppCardSize;
  type AppSettingsConfig = SettingsTypes.AppSettingsConfig;
  type DbApi = import('./src/shared/contracts/dbApi').DbApi;

  interface Window {
    db: DbApi;
  }

  const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
  const MAIN_WINDOW_VITE_NAME: string;

  namespace NodeJS {
    interface Process {
      viteDevServers: Record<string, import('vite').ViteDevServer>;
    }
  }

  type VitePluginConfig = ConstructorParameters<
    typeof import('@electron-forge/plugin-vite').VitePlugin
  >[0];

  interface VitePluginRuntimeKeys {
    VITE_DEV_SERVER_URL: `${string}_VITE_DEV_SERVER_URL`;
    VITE_NAME: `${string}_VITE_NAME`;
  }
}

declare module 'vite' {
  interface ConfigEnv<
    K extends keyof VitePluginConfig = keyof VitePluginConfig,
  > {
    root: string;
    forgeConfig: VitePluginConfig;
    forgeConfigSelf: VitePluginConfig[K][number];
  }
}
