import { expect, test } from '@playwright/test';
import {
  cleanupElectronApp,
  createAct,
  createArc,
  createCampaign,
  createScene,
  createSession,
  createWorld,
  type E2EAppContext,
  launchElectronApp,
} from './helpers';

// Exercises the multi-table JOIN roll-ups (scenes/acts/sessions "by campaign")
// and the transactional re-parenting `moveTo` handlers across the full
// arc -> act -> session -> scene hierarchy. These joins/transactions only run
// against the real Electron SQLite database.

test.describe.serial('@critical Narrative chain roll-ups and moves', () => {
  let context: E2EAppContext;

  test.beforeAll(async () => {
    context = await launchElectronApp();
  });

  test.afterAll(async () => {
    if (context) {
      await cleanupElectronApp(context);
    }
  });

  test('scenes.getAllByCampaign aggregates scenes across sessions with parent labels', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { arcId, arcName } = await createArc(page, campaignId, `Arc ${Date.now()}`);
    const { actId, actName } = await createAct(page, arcId, `Act ${Date.now()}`);
    const { sessionId: sessionAId, sessionName: sessionAName } = await createSession(
      page,
      actId,
      `Session A ${Date.now()}`,
    );
    const { sessionId: sessionBId } = await createSession(page, actId, `Session B ${Date.now()}`);
    await createScene(page, sessionAId, 'Ambush');
    await createScene(page, sessionAId, 'Parley');
    await createScene(page, sessionBId, 'Escape');

    const rollup = await page.evaluate(
      async (cid) => window.db.scenes.getAllByCampaign(cid),
      campaignId,
    );

    expect(rollup).toHaveLength(3);
    expect(rollup.map((scene) => scene.name).sort()).toEqual(['Ambush', 'Escape', 'Parley']);
    const ambush = rollup.find((scene) => scene.name === 'Ambush');
    expect(ambush).toMatchObject({
      arc_name: arcName,
      act_name: actName,
      session_name: sessionAName,
    });

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('moving an act to another arc keeps campaign totals but re-parents children', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { arcId: sourceArcId } = await createArc(page, campaignId, `Source Arc ${Date.now()}`);
    const { arcId: targetArcId, arcName: targetArcName } = await createArc(
      page,
      campaignId,
      `Target Arc ${Date.now()}`,
    );
    const { actId } = await createAct(page, sourceArcId, `Movable Act ${Date.now()}`);
    const { sessionId } = await createSession(page, actId, `Nested Session ${Date.now()}`);
    await createScene(page, sessionId, 'Nested Scene');

    await page.evaluate(
      async ({ movedActId, arcId }) => window.db.acts.moveTo(movedActId, arcId),
      { movedActId: actId, arcId: targetArcId },
    );

    const result = await page.evaluate(
      async ({ cid, srcArcId, tgtArcId }) => ({
        campaignActs: (await window.db.acts.getAllByCampaign(cid)).length,
        campaignScenes: (await window.db.scenes.getAllByCampaign(cid)).length,
        sourceArcActs: (await window.db.acts.getAllByArc(srcArcId)).length,
        targetArcActs: (await window.db.acts.getAllByArc(tgtArcId)).map((act) => act.id),
      }),
      { cid: campaignId, srcArcId: sourceArcId, tgtArcId: targetArcId },
    );

    expect(result.campaignActs).toBe(1);
    expect(result.campaignScenes).toBe(1);
    expect(result.sourceArcActs).toBe(0);
    expect(result.targetArcActs).toEqual([actId]);

    // The scene roll-up now reports the act's new arc as its ancestor.
    const scene = await page.evaluate(
      async (cid) => (await window.db.scenes.getAllByCampaign(cid))[0],
      campaignId,
    );
    expect(scene.arc_name).toBe(targetArcName);

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('moving a session and a scene re-parents them at their own levels', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { arcId } = await createArc(page, campaignId);
    const { actId: actAId } = await createAct(page, arcId, `Act A ${Date.now()}`);
    const { actId: actBId } = await createAct(page, arcId, `Act B ${Date.now()}`);
    const { sessionId } = await createSession(page, actAId, `Roaming Session ${Date.now()}`);
    const { sessionId: otherSessionId, sessionName: otherSessionName } = await createSession(
      page,
      actBId,
      `Anchor Session ${Date.now()}`,
    );
    const { sceneId } = await createScene(page, sessionId, 'Roaming Scene');

    await page.evaluate(
      async ({ movedSessionId, actId }) => window.db.sessions.moveTo(movedSessionId, actId),
      { movedSessionId: sessionId, actId: actBId },
    );
    await page.evaluate(
      async ({ movedSceneId, actTargetId, sessionTargetId }) =>
        window.db.scenes.moveTo(movedSceneId, actTargetId, sessionTargetId),
      { movedSceneId: sceneId, actTargetId: actBId, sessionTargetId: otherSessionId },
    );

    const result = await page.evaluate(
      async ({ actAId2, actBId2, srcSessionId, tgtSessionId }) => ({
        actASessions: (await window.db.sessions.getAllByAct(actAId2)).length,
        actBSessions: (await window.db.sessions.getAllByAct(actBId2)).length,
        sourceSessionScenes: (await window.db.scenes.getAllBySession(srcSessionId)).length,
        targetSessionScenes: (await window.db.scenes.getAllBySession(tgtSessionId)).map((scene) =>
          scene.name
        ),
      }),
      {
        actAId2: actAId,
        actBId2: actBId,
        srcSessionId: sessionId,
        tgtSessionId: otherSessionId,
      },
    );

    expect(result.actASessions).toBe(0);
    expect(result.actBSessions).toBe(2);
    expect(result.sourceSessionScenes).toBe(0);
    expect(result.targetSessionScenes).toEqual(['Roaming Scene']);

    const scene = await page.evaluate(
      async (cid) => (await window.db.scenes.getAllByCampaign(cid))[0],
      campaignId,
    );
    expect(scene.session_name).toBe(otherSessionName);

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });

  test('deleting a middle act compacts sibling sort_order to stay contiguous', async () => {
    const { page } = context;
    const { worldId } = await createWorld(page);
    const { campaignId } = await createCampaign(page, worldId);
    const { arcId } = await createArc(page, campaignId);
    const { actId: firstId } = await createAct(page, arcId, `First ${Date.now()}`);
    const { actId: middleId } = await createAct(page, arcId, `Middle ${Date.now()}`);
    const { actId: lastId } = await createAct(page, arcId, `Last ${Date.now()}`);

    const initial = await page.evaluate(
      async (id) => (await window.db.acts.getAllByArc(id)).map((act) => act.sort_order),
      arcId,
    );
    expect(initial).toEqual([0, 1, 2]);

    await page.evaluate(async (id) => window.db.acts.delete(id), middleId);

    // The delete handler resequences the arc so remaining acts keep a dense,
    // gap-free 0..n order rather than leaving a hole where the middle act was.
    const after = await page.evaluate(
      async (id) =>
        (await window.db.acts.getAllByArc(id)).map((act) => ({
          id: act.id,
          sort_order: act.sort_order,
        })),
      arcId,
    );
    expect(after).toEqual([
      { id: firstId, sort_order: 0 },
      { id: lastId, sort_order: 1 },
    ]);

    await page.evaluate(async (wid) => window.db.worlds.delete(wid), worldId);
  });
});
