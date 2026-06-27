# <Feature Name>

<!--
This template is for user-facing feature docs (CRUD pages, runtime behavior, etc).
Process/infra docs (CI setup, tooling, optimization guides) are not features and do not
need to follow this header set.

`#` below marks required sections. Others are optional — include only when applicable.
Keep section names exact so agents and humans can jump to the same heading across every
feature doc.
-->

## Purpose

<!-- # required: one short paragraph describing the problem this feature solves. -->

## Scope (Current Implementation)

<!-- Only for features big enough to need an explicit in/out boundary. List what's included,
then explicit non-goals if they belong here instead of in Known Limits and Non-Goals. -->

## User-Facing Behavior

<!-- # required: behavior by route/page/component. What users can do, states shown,
validation messages, important constraints or invariants. -->

## Architecture Notes

<!-- # required: renderer components, IPC channels + main-process handlers, preload bridge
methods, key files. One section — don't split IPC contract out separately. -->

## Data Model

<!-- # required: database schema + shared TS type shape. -->

## Validation and Error Rules

<!-- Renderer-side and main-handler validation rules, with exact error message strings. -->

## Tests

<!-- # required: real test files (unit + e2e) with a one-line description of what each covers. -->

## Known Limits and Non-Goals

<!-- # required: one merged section. Anything intentionally deferred or explicitly out of scope. -->

## Related Files

<!-- Optional trailing list, only when Architecture Notes doesn't already enumerate every file. -->
