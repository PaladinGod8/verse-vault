import type Database from 'better-sqlite3';

function ensurePositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
}

export type TokensRepo = {
  moveToWorld(tokenId: number): Token;
  moveToCampaign(tokenId: number, targetCampaignId: number): Token;
};

export function createTokensRepo(database: Database.Database): TokensRepo {
  const moveTokenToWorld = database.transaction((tokenId: number): Token => {
    const existingToken = database
      .prepare('SELECT * FROM tokens WHERE id = ?')
      .get(tokenId) as Token | undefined;
    if (!existingToken) {
      throw new Error('Token not found');
    }

    database
      .prepare(
        "UPDATE tokens SET campaign_id = NULL, updated_at = datetime('now') WHERE id = ?",
      )
      .run(tokenId);

    const updatedToken = database
      .prepare('SELECT * FROM tokens WHERE id = ?')
      .get(tokenId) as Token | undefined;
    if (!updatedToken) {
      throw new Error('Token not found');
    }

    return updatedToken;
  });

  const moveTokenToCampaign = database.transaction(
    (tokenId: number, targetCampaignId: number): Token => {
      const existingToken = database
        .prepare('SELECT id, world_id FROM tokens WHERE id = ?')
        .get(tokenId) as { id: number; world_id: number; } | undefined;
      if (!existingToken) {
        throw new Error('Token not found');
      }

      const targetCampaign = database
        .prepare('SELECT id, world_id FROM campaigns WHERE id = ?')
        .get(targetCampaignId) as { id: number; world_id: number; } | undefined;
      if (!targetCampaign) {
        throw new Error('Campaign not found');
      }

      if (targetCampaign.world_id !== existingToken.world_id) {
        throw new Error('Campaign not in the same world');
      }

      database
        .prepare(
          "UPDATE tokens SET campaign_id = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .run(targetCampaignId, tokenId);

      const updatedToken = database
        .prepare('SELECT * FROM tokens WHERE id = ?')
        .get(tokenId) as Token | undefined;
      if (!updatedToken) {
        throw new Error('Token not found');
      }

      return updatedToken;
    },
  );

  return {
    moveToWorld(tokenId) {
      ensurePositiveInteger(tokenId, 'tokenId');
      return moveTokenToWorld(tokenId);
    },
    moveToCampaign(tokenId, targetCampaignId) {
      ensurePositiveInteger(tokenId, 'tokenId');
      ensurePositiveInteger(targetCampaignId, 'targetCampaignId');
      return moveTokenToCampaign(tokenId, targetCampaignId);
    },
  };
}
