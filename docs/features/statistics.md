# Statistics System

## Overview

The Statistics System provides a flexible framework for defining and managing TTRPG character statistics at both the world level (configuration) and statblock level (values). It supports two types of statistics:

- **Resource Statistics**: Values with current/maximum pairs (e.g., HP: 45/60)
- **Passive Scores**: Single values with optional calculated modifiers (e.g., STR: 16, modifier +3)

## Architecture

### Two-Tier Design

1. **World Configuration** (`world.config.statistics`)
   - Defines what statistics exist for this world/campaign
   - Each world can have different statistics (D&D 5e vs Pathfinder vs homebrew)
   - Stores definitions: ID, name, abbreviation, description, type
   - No values stored at world level

2. **StatBlock Values** (`statblock.config.statistics`)
   - Stores actual values for a specific character/creature
   - References world definitions by ID
   - Stores current/maximum for resources
   - Stores baseValue and calculated modifiers for passive scores

### Data Flow

```
World Config                StatBlock Config              UI Display
┌─────────────────┐        ┌────────────────────┐       ┌──────────────┐
│ resources: [    │        │ resources: [       │       │ HP: 45/60    │
│   {             │───────▶│   {                │──────▶│ STR: 16 (+3) │
│     id: "hp"    │        │     id: "hp"       │       │              │
│     name: "Hit  │        │     current: 45    │       │              │
│     Points"     │        │     maximum: 60    │       │              │
│   }             │        │   }                │       │              │
│ ]               │        │ ]                  │       │              │
└─────────────────┘        └────────────────────┘       └──────────────┘
```

## Default Statistics (D&D 5e)

New worlds are pre-populated with:

**Resources:**

- HP (Hit Points)
- MP (Magic Points / Spell Slots)
- AC (Armor Class)

**Passive Scores:**

- STR (Strength)
- DEX (Dexterity)
- CON (Constitution)
- INT (Intelligence)
- WIS (Wisdom)
- CHA (Charisma)
- PB (Proficiency Bonus)

Users can fully customize: edit descriptions, delete defaults, or add new statistics.

## Modifier Calculations

### Ability Modifiers (D&D 5e)

Formula: `floor((baseValue - 10) / 2)`

Examples:

- STR 8 → Modifier -1
- STR 10 → Modifier 0
- STR 16 → Modifier +3
- STR 20 → Modifier +5

### Save Modifiers

Formula: `floor((saveDC - 10) / 2)`

Currently defaults to base value but designed for future customization.

## User Workflows

### DM: Configure World Statistics

1. Create or edit world
2. Navigate to "Statistics Configuration" page
3. **Edit Resources**:
   - Click "Edit" on existing resource
   - Modify name, abbreviation, description
   - Save changes
4. **Add Custom Resource**:
   - Click "Add Resource"
   - Enter ID (unique, hyphenated: `ki-points`)
   - Enter name and abbreviation (max 5 chars)
   - Save
5. **Edit Passive Scores**:
   - Similar to resources
   - Choose type: ability_score or proficiency_bonus
6. **Delete Statistics**:
   - Click "Delete" on unwanted statistic
   - Confirm deletion
   - Existing statblocks will have this statistic removed on next save

### Player/DM: Set StatBlock Statistics

1. Create or edit statblock
2. Select world (statistics auto-load)
3. **Fill Resources**:
   - Enter current and maximum values
   - Validation: current ≤ maximum
4. **Fill Passive Scores**:
   - Enter base value
   - Modifiers calculate automatically (read-only)
5. Save statblock
6. **View on Card**:
   - First 3 resources shown (HP, MP, AC)
   - All passive scores shown as compact badges

## Technical Details

### Storage Format

**World Config:**

```json
{
  "statistics": {
    "resources": [
      {
        "id": "hp",
        "name": "Hit Points",
        "abbreviation": "HP",
        "description": "Total health"
      }
    ],
    "passiveScores": [
      {
        "id": "str",
        "name": "Strength",
        "abbreviation": "STR",
        "type": "ability_score"
      }
    ]
  }
}
```

**StatBlock Config:**

```json
{
  "statistics": {
    "resources": [
      {
        "id": "hp",
        "current": 45,
        "maximum": 60
      }
    ],
    "passiveScores": [
      {
        "id": "str",
        "baseValue": 16,
        "abilityModifier": 3,
        "saveDC": 16,
        "saveModifier": 3
      }
    ]
  }
}
```

### Key Files

**Types:**

- `src/shared/statisticsTypes.ts` - TypeScript interfaces

**Utilities:**

- `src/renderer/lib/statisticsCalculations.ts` - Modifier calculations and validation
- `src/renderer/lib/statblockStatisticsUtils.ts` - Parse/serialize utilities

**Components:**

- `src/renderer/pages/WorldStatisticsConfigPage.tsx` - World configuration UI
- `src/renderer/components/statistics/ResourceDefinitionForm.tsx` - Resource CRUD
- `src/renderer/components/statistics/PassiveScoreDefinitionForm.tsx` - Passive score CRUD
- `src/renderer/components/statistics/ResourceStatisticInput.tsx` - Statblock resource input
- `src/renderer/components/statistics/PassiveScoreInput.tsx` - Statblock passive score input

**Database:**

- World config migration in `src/database/db.ts`
- IPC handlers updated: `WORLDS_ADD`, `WORLDS_UPDATE`

### Validation Rules

- Resource current must be ≤ maximum
- Resource values must be ≥ 0
- Abbreviations max 5 characters
- Passive score base values 0-99 (flexible range)
- IDs must be unique within type (resources vs passive scores)

### Edge Cases

- **Deleted Statistics**: When world statistics are deleted, existing statblocks gracefully filter them out on next save
- **Missing Values**: Components handle missing statistics with null checks
- **Invalid JSON**: Parse functions return empty arrays on error
- **World Without Config**: Falls back to empty statistics arrays

## Future Enhancements

- Custom save DC per passive score (override default)
- Damage types and resistances
- Conditions and status effects
- Skills tied to ability scores
- Spellcasting statistics
- Export/import statistics templates
- Community-shared statistics packs (D&D, Pathfinder, homebrew systems)

## Testing

- Unit tests: `tests/unit/statisticsCalculations.test.ts`, `tests/unit/statblockStatisticsUtils.test.ts`
- E2E tests: `tests/e2e/world-statistics-config.test.ts`, `tests/e2e/statblock-statistics.test.ts`
- Coverage target: >80% for new code

## Related Documentation

- [Architecture](../01_ARCHITECTURE.md)
- [IPC Contract](../03_IPC_CONTRACT.md)
- [Codebase Map](../02_CODEBASE_MAP.md)
- [StatBlocks Feature](./statblocks.md)
- [Worlds Feature](./worlds.md)
