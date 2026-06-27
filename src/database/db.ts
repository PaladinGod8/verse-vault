/**
 * @role SQLite repository hub
 * @owns Schema initialization, migrations, and database-backed domain helpers
 * @seam Main-process persistence adapter consumed by IPC registrars
 * @calls better-sqlite3 statements, transactions, and migration helpers
 */
import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import { runMigrations } from './migrations';
import { createTokensRepo } from './repos/tokensRepo';
import { createCoreTables } from './schema';

let databaseConnection: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!databaseConnection) {
    const dbPath = path.join(app.getPath('userData'), 'verse-vault.db');
    databaseConnection = new Database(dbPath);
    databaseConnection.pragma('journal_mode = WAL');
    createCoreTables(databaseConnection);
    runMigrations(databaseConnection);
  }
  return databaseConnection;
}

export function closeDatabase(): void {
  if (databaseConnection) {
    databaseConnection.close();
    databaseConnection = null;
  }
}

export { ensureTokenConfigJsonText } from './tokenConfigValidation';

export const db = {
  tokens: {
    moveToWorld(tokenId: number): Token {
      return createTokensRepo(getDatabase()).moveToWorld(tokenId);
    },
    moveToCampaign(tokenId: number, targetCampaignId: number): Token {
      return createTokensRepo(getDatabase()).moveToCampaign(
        tokenId,
        targetCampaignId,
      );
    },
  },
};
