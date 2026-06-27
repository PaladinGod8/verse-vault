type ActiveAbilityFieldsProps = {
  castCost: string;
  onCastCostChange: (value: string) => void;
  rangeCells: string;
  onRangeCellsChange: (value: string) => void;
  aoeShape: string;
  onAoeShapeChange: (value: string) => void;
  aoeSizeCells: string;
  onAoeSizeCellsChange: (value: string) => void;
  targetType: string;
  onTargetTypeChange: (value: string) => void;
  isSubmitting: boolean;
};

export default function ActiveAbilityFields({
  castCost,
  onCastCostChange,
  rangeCells,
  onRangeCellsChange,
  aoeShape,
  onAoeShapeChange,
  aoeSizeCells,
  onAoeSizeCellsChange,
  targetType,
  onTargetTypeChange,
  isSubmitting,
}: ActiveAbilityFieldsProps) {
  return (
    <>
      <div className='space-y-1'>
        <label
          htmlFor='ability-cast-cost'
          className='block text-sm font-medium text-slate-800'
        >
          Cast cost (JSON object)
        </label>
        <textarea
          id='ability-cast-cost'
          value={castCost}
          onChange={(event) => onCastCostChange(event.target.value)}
          className='min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='{"mana":10}'
          disabled={isSubmitting}
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='ability-range-cells'
          className='block text-sm font-medium text-slate-800'
        >
          Range (cells)
        </label>
        <input
          id='ability-range-cells'
          type='number'
          min={1}
          step={1}
          value={rangeCells}
          onChange={(event) => onRangeCellsChange(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          placeholder='e.g. 6'
          disabled={isSubmitting}
        />
      </div>

      <div className='space-y-1'>
        <label
          htmlFor='ability-aoe-shape'
          className='block text-sm font-medium text-slate-800'
        >
          AoE shape
        </label>
        <select
          id='ability-aoe-shape'
          value={aoeShape}
          onChange={(event) => onAoeShapeChange(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          disabled={isSubmitting}
        >
          <option value=''>None</option>
          <option value='circle'>circle</option>
          <option value='rectangle'>rectangle</option>
          <option value='cone'>cone</option>
          <option value='line'>line</option>
        </select>
      </div>

      {aoeShape
        ? (
          <div className='space-y-1'>
            <label
              htmlFor='ability-aoe-size-cells'
              className='block text-sm font-medium text-slate-800'
            >
              AoE size (cells)
            </label>
            <input
              id='ability-aoe-size-cells'
              type='number'
              min={1}
              step={1}
              value={aoeSizeCells}
              onChange={(event) => onAoeSizeCellsChange(event.target.value)}
              className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
              placeholder='e.g. 3'
              disabled={isSubmitting}
            />
          </div>
        )
        : null}

      <div className='space-y-1'>
        <label
          htmlFor='ability-target-type'
          className='block text-sm font-medium text-slate-800'
        >
          Target type
        </label>
        <select
          id='ability-target-type'
          value={targetType}
          onChange={(event) => onTargetTypeChange(event.target.value)}
          className='w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 transition outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200'
          disabled={isSubmitting}
        >
          <option value=''>None</option>
          <option value='tile'>tile</option>
          <option value='token'>token</option>
        </select>
      </div>
    </>
  );
}
