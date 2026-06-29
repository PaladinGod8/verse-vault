import type Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { createTokensRepo } from '../../../src/database/repos/tokensRepo';

type CampaignRow = { id: number; world_id: number; };

function buildToken(overrides: Partial<Token> = {}): Token {
  return {
    id: 1,
    world_id: 10,
    campaign_id: 20,
    grid_type: 'square',
    name: 'Scout',
    image_src: null,
    config: '{}',
    is_visible: 1,
    created_at: '2026-01-01 00:00:00',
    updated_at: '2026-01-01 00:00:00',
    ...overrides,
  };
}

function buildDatabase(input?: {
  tokens?: Token[];
  campaigns?: CampaignRow[];
}): Database.Database {
  const tokens = new Map(
    (input?.tokens ?? [buildToken()]).map((token) => [token.id, { ...token }]),
  );
  const campaigns = new Map(
    (input?.campaigns ?? [{ id: 20, world_id: 10 }]).map((
      campaign,
    ) => [campaign.id, { ...campaign }]),
  );

  return {
    prepare(sql: string) {
      if (sql === 'SELECT * FROM tokens WHERE id = ?') {
        return {
          get(tokenId: number) {
            return tokens.get(tokenId);
          },
        };
      }

      if (sql === 'SELECT id, world_id FROM tokens WHERE id = ?') {
        return {
          get(tokenId: number) {
            const token = tokens.get(tokenId);
            return token ? { id: token.id, world_id: token.world_id } : undefined;
          },
        };
      }

      if (sql === 'SELECT id, world_id FROM campaigns WHERE id = ?') {
        return {
          get(campaignId: number) {
            return campaigns.get(campaignId);
          },
        };
      }

      if (
        sql === "UPDATE tokens SET campaign_id = NULL, updated_at = datetime('now') WHERE id = ?"
      ) {
        return {
          run(tokenId: number) {
            const token = tokens.get(tokenId);
            if (token) {
              token.campaign_id = null;
              token.updated_at = '2026-02-01 00:00:00';
            }
          },
        };
      }

      if (sql === "UPDATE tokens SET campaign_id = ?, updated_at = datetime('now') WHERE id = ?") {
        return {
          run(campaignId: number, tokenId: number) {
            const token = tokens.get(tokenId);
            if (token) {
              token.campaign_id = campaignId;
              token.updated_at = '2026-02-01 00:00:00';
            }
          },
        };
      }

      throw new Error(`Unexpected SQL in test database: ${sql}`);
    },
    transaction<TArgs extends unknown[], TResult>(
      callback: (...args: TArgs) => TResult,
    ) {
      return ((...args: TArgs) => callback(...args)) as (...args: TArgs) => TResult;
    },
  } as Database.Database;
}

describe('tokensRepo', () => {
  it('moves a token back to the world scope', () => {
    const repo = createTokensRepo(buildDatabase());

    const moved = repo.moveToWorld(1);

    expect(moved.campaign_id).toBeNull();
    expect(moved.updated_at).toBe('2026-02-01 00:00:00');
  });

  it('throws when moving an unknown token back to the world scope', () => {
    const repo = createTokensRepo(buildDatabase({ tokens: [] }));

    expect(() => repo.moveToWorld(999)).toThrow('Token not found');
  });

  it('moves a token into a campaign in the same world', () => {
    const repo = createTokensRepo(
      buildDatabase({
        tokens: [buildToken({ id: 4, campaign_id: null, world_id: 8 })],
        campaigns: [{ id: 12, world_id: 8 }],
      }),
    );

    const moved = repo.moveToCampaign(4, 12);

    expect(moved.campaign_id).toBe(12);
    expect(moved.updated_at).toBe('2026-02-01 00:00:00');
  });

  it('throws when moving an unknown token into a campaign', () => {
    const repo = createTokensRepo(buildDatabase({ tokens: [] }));

    expect(() => repo.moveToCampaign(999, 20)).toThrow('Token not found');
  });

  it('throws when moving a token into an unknown campaign', () => {
    const repo = createTokensRepo(buildDatabase({ campaigns: [] }));

    expect(() => repo.moveToCampaign(1, 999)).toThrow('Campaign not found');
  });

  it('rejects cross-world campaign moves', () => {
    const repo = createTokensRepo(
      buildDatabase({
        tokens: [buildToken({ id: 3, world_id: 1, campaign_id: null })],
        campaigns: [{ id: 20, world_id: 2 }],
      }),
    );

    expect(() => repo.moveToCampaign(3, 20)).toThrow('Campaign not in the same world');
  });

  it('validates positive integer ids on public methods', () => {
    const repo = createTokensRepo(buildDatabase());

    expect(() => repo.moveToWorld(0)).toThrow('Invalid tokenId');
    expect(() => repo.moveToCampaign(1.5, 20)).toThrow('Invalid tokenId');
    expect(() => repo.moveToCampaign(1, 0)).toThrow('Invalid targetCampaignId');
  });
});
