# 0001: Scenes are anchored to a Campaign and an Act, not required to belong to a Session

## Status

Accepted

## Context

The original hierarchy was strictly linear: `World > Campaign > Arc > Act > Session > Scene`, with `scenes.session_id` as a `NOT NULL` foreign key. A Scene could only be created, listed, or reparented through its Session, and the only way to reach a Scene's editor was via `Session -> Scenes` or the read-only campaign-wide index.

This made Session purely mandatory scaffolding: a Scene could not exist without first creating a Session to hold it, even when the user just wanted a loose scene attached to an Act (or wanted to move a scene out of a session without deleting it).

## Decision

- `scenes` gains `campaign_id` (`NOT NULL`, FK -> `campaigns`, `ON DELETE CASCADE`) as its permanent anchor, and `act_id` (nullable, FK -> `acts`, `ON DELETE CASCADE`).
- `scenes.session_id` becomes nullable (FK -> `sessions`, `ON DELETE CASCADE`). A NULL `session_id` means the scene is "stray" — anchored to its Act but not grouped into any Session.
- Invariant: when `session_id` is set, `act_id` is kept in sync with that session's `act_id` (the session is the source of truth for which act a grouped scene belongs to).
- Session remains a pure grouping mechanic under an Act, not a required link for a Scene to exist.
- Existing data is migrated in place (`runSceneAnchorMigration` in `src/database/legacyShapeMigrations.ts`): `campaign_id`/`act_id` are backfilled for every existing scene by joining through its current `session_id -> act_id -> campaign_id` chain.
- The IPC surface reflects this: `SCENES_ADD` accepts `act_id` (required) and an optional `session_id`; the old `SCENES_MOVE_TO_SESSION` channel is replaced by a single `SCENES_MOVE_TO_ACT(sceneId, newActId, newSessionId | null)` that can reparent a scene to any Act in the campaign, with or without a target Session, in one transaction.
- A new Act-level route (`.../act/:actId/scenes` -> `ActScenesPage`) lists every scene anchored to that Act — both grouped-by-session and stray — putting Scenes on the same navigational tier as Sessions underneath Act. This page does not support drag-to-reorder (it mixes heterogeneous groups); reordering within a session still happens on the existing session-scoped Scenes page.

## Consequences

- A Scene can be created directly under an Act with no Session at all ("stray"), and later grouped into a Session (or moved back out) via the Move dialog without losing its identity, notes, or payload.
- Scenes can be reparented across Acts (and Arcs) in a single operation, mirroring the reparenting pattern already used for `Session -> Act` and `Act -> Arc`.
- The campaign-wide scenes index (`CampaignScenesPage`) now reads via `LEFT JOIN`s and must render `session_name`/`act_name`/`arc_id`/`arc_name` as optional; its "Open ... Scenes" link now branches between the session-scoped route and the new act-scoped route depending on whether the scene is grouped.
- A fully unanchored scene (no `act_id`, no `session_id`, only `campaign_id`) is representable in the schema but is not reachable through any current UI or IPC creation path — every existing creation flow supplies an `act_id`. This is intentional headroom, not a shipped feature.
