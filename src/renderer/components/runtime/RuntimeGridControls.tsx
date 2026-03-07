import { clampGridCellSize, MAX_GRID_CELL_SIZE, MIN_GRID_CELL_SIZE } from '../../lib/runtimeMath';

type RuntimeGridControlsProps = {
  gridConfig: BattleMapRuntimeGridConfig;
  isSaving: boolean;
  saveError: string | null;
  onChange: (nextGridConfig: BattleMapRuntimeGridConfig) => void;
};

const GRID_MODE_OPTIONS: Array<{ value: BattleMapGridMode; label: string; }> = [
  { value: 'square', label: 'Square' },
  { value: 'hex', label: 'Hex' },
  { value: 'none', label: 'None' },
];

function parseOriginNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function isHalfCellOrigin(value: number, cellSize: number): boolean {
  return Math.abs(value - cellSize * 0.5) < 0.001;
}

export default function RuntimeGridControls({
  gridConfig,
  isSaving,
  saveError,
  onChange,
}: RuntimeGridControlsProps) {
  const updateGridConfig = (patch: Partial<BattleMapRuntimeGridConfig>) => {
    onChange({
      ...gridConfig,
      ...patch,
    });
  };

  const handleModeChange = (value: string) => {
    if (value === 'square' || value === 'hex' || value === 'none') {
      updateGridConfig({ mode: value });
    }
  };

  const handleCellSizeChange = (value: string) => {
    const parsed = Number(value);
    updateGridConfig({
      cellSize: clampGridCellSize(parsed, gridConfig.cellSize),
    });
  };

  const handleOriginXChange = (value: string) => {
    updateGridConfig({
      originX: parseOriginNumber(value, gridConfig.originX),
    });
  };

  const handleOriginYChange = (value: string) => {
    updateGridConfig({
      originY: parseOriginNumber(value, gridConfig.originY),
    });
  };

  const halfCell = gridConfig.cellSize * 0.5;

  return (
    <section className='space-y-4 border-b border-slate-800 px-6 py-4'>
      <div className='flex items-center justify-between gap-3'>
        <h2 className='text-sm font-semibold tracking-wide text-slate-300 uppercase'>
          Runtime Grid Controls
        </h2>
        <span
          className={`text-xs ${
            saveError
              ? 'text-rose-300'
              : isSaving
              ? 'text-slate-300'
              : 'text-emerald-300'
          }`}
        >
          {saveError ? 'Save failed' : isSaving ? 'Saving...' : 'Saved'}
        </span>
      </div>

      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <label className='space-y-2'>
          <span className='text-xs font-medium tracking-wide text-slate-300 uppercase'>
            Grid Mode
          </span>
          <select
            value={gridConfig.mode}
            onChange={(event) => handleModeChange(event.target.value)}
            className='w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none'
          >
            {GRID_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className='space-y-2'>
          <label
            htmlFor='runtime-grid-cell-size'
            className='text-xs font-medium tracking-wide text-slate-300 uppercase'
          >
            Cell Size
          </label>
          <input
            id='runtime-grid-cell-size'
            type='range'
            min={MIN_GRID_CELL_SIZE}
            max={MAX_GRID_CELL_SIZE}
            step={1}
            value={gridConfig.cellSize}
            onChange={(event) => handleCellSizeChange(event.target.value)}
            className='w-full accent-slate-200'
          />
          <div className='flex items-center gap-2'>
            <input
              type='number'
              min={MIN_GRID_CELL_SIZE}
              max={MAX_GRID_CELL_SIZE}
              step={1}
              value={gridConfig.cellSize}
              onChange={(event) => handleCellSizeChange(event.target.value)}
              className='w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none'
            />
            <span className='text-xs text-slate-300'>px</span>
          </div>
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='runtime-grid-origin-x'
            className='text-xs font-medium tracking-wide text-slate-300 uppercase'
          >
            Origin X
          </label>
          <input
            id='runtime-grid-origin-x'
            type='number'
            step={1}
            value={gridConfig.originX}
            onChange={(event) => handleOriginXChange(event.target.value)}
            className='w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none'
          />
          <button
            type='button'
            onClick={() =>
              updateGridConfig({
                originX: isHalfCellOrigin(
                    gridConfig.originX,
                    gridConfig.cellSize,
                  )
                  ? 0
                  : halfCell,
              })}
            className='w-full rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white'
          >
            Toggle Half Cell
          </button>
        </div>

        <div className='space-y-2'>
          <label
            htmlFor='runtime-grid-origin-y'
            className='text-xs font-medium tracking-wide text-slate-300 uppercase'
          >
            Origin Y
          </label>
          <input
            id='runtime-grid-origin-y'
            type='number'
            step={1}
            value={gridConfig.originY}
            onChange={(event) => handleOriginYChange(event.target.value)}
            className='w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none'
          />
          <button
            type='button'
            onClick={() =>
              updateGridConfig({
                originY: isHalfCellOrigin(
                    gridConfig.originY,
                    gridConfig.cellSize,
                  )
                  ? 0
                  : halfCell,
              })}
            className='w-full rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white'
          >
            Toggle Half Cell
          </button>
        </div>
      </div>

      <div className='flex items-center justify-between gap-3'>
        <button
          type='button'
          onClick={() =>
            updateGridConfig({
              originX: 0,
              originY: 0,
            })}
          className='rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-500 hover:text-white'
        >
          Reset Origin
        </button>

        {saveError
          ? <p className='text-xs text-rose-300'>{saveError}</p>
          : (
            <p className='text-xs text-slate-400'>
              Runtime grid settings save automatically.
            </p>
          )}
      </div>
    </section>
  );
}
