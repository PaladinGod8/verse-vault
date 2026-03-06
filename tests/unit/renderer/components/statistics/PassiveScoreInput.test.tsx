import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PassiveScoreInput from '../../../../../src/renderer/components/statistics/PassiveScoreInput';
import type {
  PassiveScoreDefinition,
  StatBlockPassiveScoreValue,
} from '../../../../../src/shared/statisticsTypes';

describe('PassiveScoreInput', () => {
  const mockAbilityScoreDef: PassiveScoreDefinition = {
    id: 'str',
    name: 'Strength',
    abbreviation: 'STR',
    type: 'ability_score',
    description: 'Physical power',
    isDefault: true,
  };

  const mockProficiencyBonusDef: PassiveScoreDefinition = {
    id: 'pb',
    name: 'Proficiency Bonus',
    abbreviation: 'PB',
    type: 'proficiency_bonus',
    isDefault: true,
  };

  describe('rendering', () => {
    it('renders definition name and abbreviation', () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={null}
          onChange={onChange}
        />,
      );

      expect(screen.getByText(/Strength \(STR\)/)).toBeInTheDocument();
    });

    it('renders description when provided', () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={null}
          onChange={onChange}
        />,
      );

      expect(screen.getByText('Physical power')).toBeInTheDocument();
    });

    it('does not render description when not provided', () => {
      const onChange = vi.fn();
      const defWithoutDesc: PassiveScoreDefinition = {
        ...mockAbilityScoreDef,
        description: undefined,
      };
      render(
        <PassiveScoreInput
          definition={defWithoutDesc}
          value={null}
          onChange={onChange}
        />,
      );

      expect(screen.queryByText('Physical power')).not.toBeInTheDocument();
    });

    it('renders base value input with correct value', () => {
      const onChange = vi.fn();
      const value: StatBlockPassiveScoreValue = {
        baseValue: 16,
        abilityModifier: 3,
        saveDC: 16,
        saveModifier: 3,
      };
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={value}
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText('Base Value') as HTMLInputElement;
      expect(input.value).toBe('16');
    });

    it('initializes with base value 10 when value is null', () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={null}
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText('Base Value') as HTMLInputElement;
      expect(input.value).toBe('10');
    });
  });

  describe('ability score type', () => {
    it('renders ability modifier for ability_score type', () => {
      const onChange = vi.fn();
      const value: StatBlockPassiveScoreValue = {
        baseValue: 16,
        abilityModifier: 3,
        saveDC: 16,
        saveModifier: 3,
      };
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={value}
          onChange={onChange}
        />,
      );

      expect(screen.getByText('Ability Modifier')).toBeInTheDocument();
      expect(screen.getAllByText('+3')[0]).toBeInTheDocument();
    });

    it('renders save modifier for ability_score type with saveDC', () => {
      const onChange = vi.fn();
      const value: StatBlockPassiveScoreValue = {
        baseValue: 16,
        abilityModifier: 3,
        saveDC: 16,
        saveModifier: 3,
      };
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={value}
          onChange={onChange}
        />,
      );

      expect(screen.getByText('Save Modifier')).toBeInTheDocument();
      // Should show +3 for saveDC 16
      const modifierElements = screen.getAllByText('+3');
      expect(modifierElements).toHaveLength(2); // Ability and Save modifiers
    });

    it('renders modifier formula help text for ability_score type', () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={null}
          onChange={onChange}
        />,
      );

      expect(
        screen.getByText('Modifier formula: floor((base - 10) / 2)'),
      ).toBeInTheDocument();
    });

    it('calculates correct ability modifier forbase value changes', async () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={null}
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText('Base Value') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '18' } });

      expect(onChange).toHaveBeenCalledWith({
        baseValue: 18,
        abilityModifier: 4, // floor((18 - 10) / 2) = 4
        saveDC: 18,
        saveModifier: 4,
      });
    });

    it('calculates negative ability modifier for low base values', async () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={null}
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText('Base Value') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '8' } });

      expect(onChange).toHaveBeenCalledWith({
        baseValue: 8,
        abilityModifier: -1, // floor((8 - 10) / 2) = -1
        saveDC: 8,
        saveModifier: -1,
      });
    });

    it('uses existing saveDC when updating base value', async () => {
      const onChange = vi.fn();
      const value: StatBlockPassiveScoreValue = {
        baseValue: 16,
        abilityModifier: 3,
        saveDC: 20, // Different from base value
        saveModifier: 5,
      };
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={value}
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText('Base Value') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '14' } });

      expect(onChange).toHaveBeenLastCalledWith({
        baseValue: 14,
        abilityModifier: 2,
        saveDC: 20, // Should keep existing saveDC
        saveModifier: 5,
      });
    });
  });

  describe('non-ability score type', () => {
    it('does not render ability modifier for non-ability score types', () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockProficiencyBonusDef}
          value={null}
          onChange={onChange}
        />,
      );

      expect(screen.queryByText('Ability Modifier')).not.toBeInTheDocument();
    });

    it('does not render save modifier for non-ability score types', () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockProficiencyBonusDef}
          value={null}
          onChange={onChange}
        />,
      );

      expect(screen.queryByText('Save Modifier')).not.toBeInTheDocument();
    });

    it('does not render formula help text for non-ability score types', () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockProficiencyBonusDef}
          value={null}
          onChange={onChange}
        />,
      );

      expect(
        screen.queryByText('Modifier formula: floor((base - 10) / 2)'),
      ).not.toBeInTheDocument();
    });

    it('calls onChange with just baseValue for non-ability score types', async () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockProficiencyBonusDef}
          value={null}
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText('Base Value') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '5' } });

      expect(onChange).toHaveBeenCalledWith({
        baseValue: 5,
      });
    });
  });

  describe('interactive behavior', () => {
    it('disables input when disabled prop is true', () => {
      const onChange = vi.fn();
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={null}
          onChange={onChange}
          disabled={true}
        />,
      );

      const input = screen.getByLabelText('Base Value') as HTMLInputElement;
      expect(input).toBeDisabled();
    });

    it('updates input when value prop changes', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={{ baseValue: 16 }}
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText('Base Value') as HTMLInputElement;
      expect(input.value).toBe('16');

      rerender(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={{ baseValue: 14 }}
          onChange={onChange}
        />,
      );

      expect(input.value).toBe('14');
    });

    it('updates input to 10 when value prop changes to null', () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={{ baseValue: 16 }}
          onChange={onChange}
        />,
      );

      rerender(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={null}
          onChange={onChange}
        />,
      );

      const input = screen.getByLabelText('Base Value') as HTMLInputElement;
      expect(input.value).toBe('10');
    });
  });

  describe('modifier display', () => {
    it('displays zero modifier for base value 10', () => {
      const onChange = vi.fn();
      const value: StatBlockPassiveScoreValue = {
        baseValue: 10,
        abilityModifier: 0,
        saveDC: 10,
        saveModifier: 0,
      };
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={value}
          onChange={onChange}
        />,
      );

      expect(screen.getAllByText('+0')[0]).toBeInTheDocument();
    });

    it('displays positive modifier with + prefix', () => {
      const onChange = vi.fn();
      const value: StatBlockPassiveScoreValue = {
        baseValue: 20,
        abilityModifier: 5,
        saveDC: 20,
        saveModifier: 5,
      };
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={value}
          onChange={onChange}
        />,
      );

      expect(screen.getAllByText('+5')[0]).toBeInTheDocument();
    });

    it('displays negative modifier with - prefix', () => {
      const onChange = vi.fn();
      const value: StatBlockPassiveScoreValue = {
        baseValue: 6,
        abilityModifier: -2,
        saveDC: 6,
        saveModifier: -2,
      };
      render(
        <PassiveScoreInput
          definition={mockAbilityScoreDef}
          value={value}
          onChange={onChange}
        />,
      );

      expect(screen.getAllByText('-2')[0]).toBeInTheDocument();
    });
  });
});
