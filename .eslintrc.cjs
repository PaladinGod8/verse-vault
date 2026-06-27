// @ts-check
/** @type {import('eslint').Linter.Config} */
module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/electron',
    'plugin:import/typescript',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  rules: {
    'import/no-unresolved': [
      'error',
      { ignore: ['@tailwindcss/vite', 'vitest/config'] },
    ],
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            target: 'src/renderer',
            from: 'src/main.ts',
            message: 'Renderer must not import from main process.',
          },
          {
            target: 'src/renderer',
            from: 'src/main',
            message: 'Renderer must not import from main process modules.',
          },
          {
            target: 'src/renderer',
            from: 'src/database',
            message: 'Renderer must not import from database modules. Use window.db instead.',
          },
          {
            target: 'src/preload.ts',
            from: 'src/renderer',
            message: 'Preload must not import from renderer.',
          },
        ],
      },
    ],
    // Complexity budgets: prevent monolithic functions from growing unchecked.
    'max-lines-per-function': ['error', { max: 80, skipBlankLines: true, skipComments: true }],
    'complexity': ['error', 15],
  },
  overrides: [
    {
      files: ['**/*.yml', '**/*.yaml'],
      parser: 'yaml-eslint-parser',
      extends: ['plugin:yml/standard'],
      rules: {
        'max-lines-per-function': 'off',
        'complexity': 'off',
      },
    },
    // ── Renderer: no direct electron imports ───────────────────────────────
    {
      files: ['src/renderer/**'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            paths: [
              {
                name: 'electron',
                message: 'Do not import electron in renderer. Use window.db for IPC.',
              },
            ],
          },
        ],
      },
    },

    // ── File-size budget: src/** ≤ 400 lines ───────────────────────────────
    {
      files: ['src/**/*.ts', 'src/**/*.tsx'],
      rules: {
        'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
      },
    },

    // ── File-size budget: tests/** ≤ 600 lines ─────────────────────────────
    {
      files: ['tests/**/*.ts', 'tests/**/*.tsx'],
      rules: {
        'max-lines': ['error', { max: 600, skipBlankLines: true, skipComments: true }],
      },
    },
    {
      files: ['tests/e2e/*.test.ts'],
      rules: {
        'no-restricted-syntax': [
          'error',
          {
            selector: "CallExpression[callee.property.name='waitForTimeout']",
            message:
              'Use deterministic waits such as expect(...).toBeVisible(), waitForFunction(), or requestAnimationFrame-based helpers instead of waitForTimeout().',
          },
          {
            selector: "CallExpression[callee.name='setTimeout']",
            message:
              'Do not add raw timing waits to E2E specs; use deterministic Playwright waits instead.',
          },
        ],
      },
    },

    // ── React components: max-lines-per-function does not apply ────────────
    // React component functions are a UI module unit, not a traditional function;
    // file-level max-lines already prevents unchecked growth.
    // TODO: remove this broad exemption after component-split efforts reduce average component size.
    {
      files: ['src/renderer/components/**/*.tsx', 'src/renderer/pages/**/*.tsx'],
      rules: {
        'max-lines-per-function': 'off',
      },
    },

    // ── Tests: max-lines-per-function does not apply ───────────────────────
    // Test describe/it callbacks and setup functions span many lines by design.
    // TODO: remove this broad exemption after test-helpers feature lands.
    {
      files: ['tests/**/*.ts', 'tests/**/*.tsx'],
      rules: {
        'max-lines-per-function': 'off',
      },
    },

    // ── Known violations: src/main.ts ──────────────────────────────────────
    // TODO: remove override after ipc-domain-split feature
    {
      files: ['src/main.ts'],
      rules: {
        'max-lines': 'off',
        'max-lines-per-function': 'off',
        'complexity': 'off',
      },
    },

    // ── Known violations: BattleMapRuntimeCanvas.tsx ───────────────────────
    // TODO: remove override after component split (BattleMapRuntimeCanvas)
    {
      files: ['src/renderer/components/runtime/BattleMapRuntimeCanvas.tsx'],
      rules: {
        'max-lines': 'off',
        'complexity': 'off',
      },
    },

    // ── Known violations: BattleMapRuntimePage.tsx ─────────────────────────
    // TODO: remove override after runtime-page-split
    {
      files: ['src/renderer/pages/BattleMapRuntimePage.tsx'],
      rules: {
        'max-lines': 'off',
        'complexity': 'off',
      },
    },

    // ── Known violations: runtime canvas/page extraction ───────────────────
    // These functions were extracted verbatim out of BattleMapRuntimeCanvas.tsx
    // and BattleMapRuntimePage.tsx (both exempt from max-lines-per-function/
    // complexity as React component/page files). The complexity is carried
    // over, not newly introduced; splitting it further was assessed as
    // higher regression risk than the lint debt, since Vitest mocks PixiJS
    // and can't verify drag/pan/zoom behavior at a finer grain.
    // TODO: revisit if any of these modules grow further.
    {
      files: [
        'src/renderer/hooks/useBattleMapRuntimeBootstrap.ts',
        'src/renderer/hooks/useBattleMapRuntimeCampaignData.ts',
        'src/renderer/hooks/useBattleMapRuntimeScreenState.ts',
        'src/renderer/hooks/useRuntimeCamera.ts',
        'src/renderer/hooks/useRuntimePersistence.ts',
        'src/renderer/hooks/useRuntimeTokens.ts',
        'src/renderer/lib/runtime/castingOverlay.ts',
        'src/renderer/lib/runtime/layerRendering.ts',
        'src/renderer/lib/runtime/tokenDisplay.ts',
      ],
      rules: {
        'max-lines-per-function': 'off',
        'complexity': 'off',
      },
    },

    // ── Known violations: large src/renderer files (max-lines only) ─────────
    // TODO: remove each override after corresponding split feature
    {
      files: [
        'src/renderer/components/tokens/FootprintPainterModal.tsx',
      ],
      rules: {
        'max-lines': 'off',
      },
    },

    // ── Known violations: large src/renderer pages (max-lines + complexity) ─
    // TODO: remove each override after corresponding page-split / form-split feature
    {
      files: [
        'src/renderer/components/statblocks/StatBlockForm.tsx',
        'src/renderer/components/tokens/TokenForm.tsx',
        'src/renderer/components/sessions/SessionForm.tsx',
        'src/renderer/components/scenes/SceneForm.tsx',
        'src/renderer/components/statistics/PassiveScoreDefinitionForm.tsx',
        'src/renderer/components/statistics/ResourceDefinitionForm.tsx',
        'src/renderer/components/statistics/PassiveScoreInput.tsx',
        'src/renderer/components/statistics/ResourceStatisticInput.tsx',
        'src/renderer/components/abilities/AbilityChildrenManager.tsx',
        'src/renderer/components/runtime/RuntimeTokenPalette.tsx',
        'src/renderer/components/runtime/RuntimeGridControls.tsx',
        'src/renderer/components/runtime/AbilityPickerPanel.tsx',
        'src/renderer/components/runtime/StatBlockPopup.tsx',
        'src/renderer/components/statblocks/StatBlockCard.tsx',
        'src/renderer/components/worlds/WorldForm.tsx',
        'src/renderer/components/worlds/WorldCard.tsx',
        'src/renderer/components/worlds/WorldSidebar.tsx',
        'src/renderer/components/worlds/WorldImageDropzone.tsx',
        'src/renderer/components/tokens/TokenImageDropzone.tsx',
        'src/renderer/components/tokens/MoveTokenDialog.tsx',
        'src/renderer/components/tokens/CopyTokenToCampaignDialog.tsx',
        'src/renderer/components/battlemaps/BattleMapForm.tsx',
        'src/renderer/components/campaigns/CampaignForm.tsx',
        'src/renderer/components/levels/LevelForm.tsx',
        'src/renderer/components/acts/MoveActDialog.tsx',
        'src/renderer/components/scenes/MoveSceneDialog.tsx',
        'src/renderer/components/sessions/MoveSessionDialog.tsx',
        'src/renderer/pages/CampaignsPage.tsx',
        'src/renderer/pages/LevelsPage.tsx',
        'src/renderer/pages/BattleMapsPage.tsx',
        'src/renderer/pages/WorldPage.tsx',
        'src/renderer/pages/WorldsHomePage.tsx',
        'src/renderer/pages/WorldPagePlaceholder.tsx',
        'src/renderer/pages/CampaignScenesPage.tsx',
        'src/renderer/pages/AbilitiesPage.tsx',
        'src/renderer/pages/ArcsPage.tsx',
        'src/renderer/pages/StatBlocksPage.tsx',
      ],
      rules: {
        'max-lines': 'off',
        'complexity': 'off',
      },
    },

    // ── Known violations: tests/unit/main.test.ts ──────────────────────────
    // TODO: remove override after test-helpers feature + ipc-domain-split
    {
      files: ['tests/unit/main.test.ts'],
      rules: {
        'max-lines': 'off',
        'complexity': 'off',
      },
    },

    // ── Known violations: large test files ─────────────────────────────────
    // TODO: remove overrides after corresponding component/page splits
    {
      files: [
        'tests/unit/renderer/battleMapRuntimeCanvas.test.tsx',
        'tests/unit/renderer/battleMapRuntimePage.test.tsx',
        'tests/unit/renderer/tokensPage.test.tsx',
        'tests/e2e/tokens.test.ts',
        'tests/unit/renderer/scenesPage.test.tsx',
        'tests/unit/renderer/lib/castingRangeMath.test.ts',
        'tests/unit/StatBlocksPage.test.tsx',
        'tests/unit/renderer/sessionsPage.test.tsx',
        'tests/unit/renderer/pages/WorldStatisticsConfigPage.test.tsx',
        'tests/unit/renderer/moveTokenDialog.test.tsx',
      ],
      rules: {
        'max-lines': 'off',
      },
    },
  ],
};
