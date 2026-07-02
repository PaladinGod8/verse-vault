import type Database from 'better-sqlite3';

/**
 * Token index-ensuring migrations, split out of migrations.ts to stay within the
 * file-size budget enforced by .eslintrc.cjs.
 */
function ensureTokenCampaignIdIndex(db: Database.Database): void {
  db.exec('CREATE INDEX IF NOT EXISTS idx_tokens_campaign_id ON tokens(campaign_id)');
}

function ensureTokenWorldIdIndex(db: Database.Database): void {
  const cols = db.pragma('table_info(tokens)') as { name: string; }[];
  if (!cols.some((c) => c.name === 'world_id')) {
    return;
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_tokens_world_id ON tokens(world_id)`);
}

export function ensureTokenIndexes(db: Database.Database): void {
  ensureTokenCampaignIdIndex(db);
  ensureTokenWorldIdIndex(db);
}
