import { useEffect, useRef, useState, useCallback } from 'react';
import ModalShell from '../ui/ModalShell';

export type FootprintPainterResult = {
  footprint: TokenFootprintConfig;
  framing: TokenFramingConfig;
};

type ToolMode = 'brush' | 'eraser';

type FootprintPainterModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: FootprintPainterResult) => void;
  imageSrc: string;
  gridType: TokenGridType;
  initialFootprint?: TokenFootprintConfig;
};

type CellKey = string;

const CANVAS_PADDING = 20;
const CELL_SIZE = 40;
const OVERVIEW_SIZE = 200;
const OVERVIEW_MARGIN = 16;

function cellKey(col: number, row: number): CellKey {
  return `${col},${row}`;
}

function parseCellKey(key: CellKey): [number, number] {
  const [col, row] = key.split(',').map(Number);
  return [col, row];
}

// Hex grid helpers using axial coordinates (q, r)
function hexCellKey(q: number, r: number): CellKey {
  return `${q},${r}`;
}

function parseHexCellKey(key: CellKey): [number, number] {
  const [q, r] = key.split(',').map(Number);
  return [q, r];
}

// Convert pixel coordinates to axial hex coordinates
function pixelToHex(x: number, y: number, cellSize: number): [number, number] {
  const q = ((Math.sqrt(3) / 3) * x - y / 3) / cellSize;
  const r = ((2 / 3) * y) / cellSize;
  return hexRound(q, r);
}

function hexRound(q: number, r: number): [number, number] {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return [rq, rr];
}

// Convert axial hex coordinates to pixel coordinates
function hexToPixel(q: number, r: number, cellSize: number): [number, number] {
  const x = cellSize * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = cellSize * ((3 / 2) * r);
  return [x, y];
}

export default function FootprintPainterModal({
  isOpen,
  onClose,
  onConfirm,
  imageSrc,
  gridType,
  initialFootprint,
}: FootprintPainterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overviewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('brush');
  const [occupiedCells, setOccupiedCells] = useState<Set<CellKey>>(new Set());
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load initial footprint
  useEffect(() => {
    if (!isOpen || !initialFootprint) return;

    const cells = new Set<CellKey>();
    if (gridType === 'square' && initialFootprint.square_cells) {
      initialFootprint.square_cells.forEach((cell) => {
        cells.add(cellKey(cell.col, cell.row));
      });
    } else if (gridType === 'hex' && initialFootprint.hex_cells) {
      initialFootprint.hex_cells.forEach((cell) => {
        cells.add(hexCellKey(cell.q, cell.r));
      });
    }
    setOccupiedCells(cells);
  }, [isOpen, initialFootprint, gridType]);

  // Load image
  useEffect(() => {
    if (!isOpen) {
      setImageLoaded(false);
      setOccupiedCells(new Set());
      return;
    }

    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      imageRef.current = img;
    };
    img.onerror = () => {
      setImageLoaded(false);
    };
    img.src = imageSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isOpen, imageSrc]);

  // Draw main canvas
  useEffect(() => {
    if (!isOpen || !imageLoaded || !canvasRef.current || !imageRef.current)
      return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate image scale to fit canvas
    const scale = Math.min(
      (canvasWidth - CANVAS_PADDING * 2) / img.width,
      (canvasHeight - CANVAS_PADDING * 2) / img.height,
    );
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const offsetX = (canvasWidth - scaledWidth) / 2;
    const offsetY = (canvasHeight - scaledHeight) / 2;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw image
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

    // Draw grid and occupied cells
    ctx.save();
    ctx.translate(offsetX, offsetY);

    if (gridType === 'square') {
      drawSquareGrid(ctx, scaledWidth, scaledHeight, CELL_SIZE, occupiedCells);
    } else {
      drawHexGrid(ctx, scaledWidth, scaledHeight, CELL_SIZE, occupiedCells);
    }

    ctx.restore();
  }, [isOpen, imageLoaded, occupiedCells, gridType]);

  // Draw overview canvas
  useEffect(() => {
    if (
      !isOpen ||
      !imageLoaded ||
      !overviewCanvasRef.current ||
      !imageRef.current
    )
      return;

    const canvas = overviewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const scale = Math.min(
      OVERVIEW_SIZE / img.width,
      OVERVIEW_SIZE / img.height,
    );
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // Clear canvas
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, OVERVIEW_SIZE, OVERVIEW_SIZE);

    // Draw image
    const offsetX = (OVERVIEW_SIZE - scaledWidth) / 2;
    const offsetY = (OVERVIEW_SIZE - scaledHeight) / 2;
    ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);

    // Draw occupied cells overlay
    if (occupiedCells.size > 0) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.save();
      ctx.translate(offsetX, offsetY);

      const cellScale = scale * CELL_SIZE;
      occupiedCells.forEach((key) => {
        if (gridType === 'square') {
          const [col, row] = parseCellKey(key);
          ctx.fillRect(col * cellScale, row * cellScale, cellScale, cellScale);
        } else {
          const [q, r] = parseHexCellKey(key);
          const [x, y] = hexToPixel(q, r, CELL_SIZE * scale);
          drawHexagon(ctx, x, y, CELL_SIZE * scale * 0.85);
        }
      });

      ctx.restore();
    }
  }, [isOpen, imageLoaded, occupiedCells, gridType]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !imageRef.current) return;

      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const img = imageRef.current;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const scale = Math.min(
        (canvasWidth - CANVAS_PADDING * 2) / img.width,
        (canvasHeight - CANVAS_PADDING * 2) / img.height,
      );
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;
      const offsetX = (canvasWidth - scaledWidth) / 2;
      const offsetY = (canvasHeight - scaledHeight) / 2;

      const localX = x - offsetX;
      const localY = y - offsetY;

      if (
        localX < 0 ||
        localY < 0 ||
        localX > scaledWidth ||
        localY > scaledHeight
      ) {
        return;
      }

      let key: CellKey;
      if (gridType === 'square') {
        const col = Math.floor(localX / CELL_SIZE);
        const row = Math.floor(localY / CELL_SIZE);
        key = cellKey(col, row);
      } else {
        const [q, r] = pixelToHex(localX, localY, CELL_SIZE);
        key = hexCellKey(q, r);
      }

      setOccupiedCells((prev) => {
        const next = new Set(prev);
        if (toolMode === 'brush') {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [gridType, toolMode],
  );

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsPainting(true);
    handleCanvasClick(e);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPainting) {
      handleCanvasClick(e);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPainting(false);
  };

  const handleCanvasMouseLeave = () => {
    setIsPainting(false);
  };

  const handleConfirm = () => {
    if (occupiedCells.size === 0) {
      return; // Block save when no cells are painted
    }

    const footprint: TokenFootprintConfig = {
      version: 1,
      grid_type: gridType,
    };

    const framing: TokenFramingConfig = {};

    if (gridType === 'square') {
      const cells: TokenSquareFootprintCell[] = [];
      let minCol = Infinity;
      let maxCol = -Infinity;
      let minRow = Infinity;
      let maxRow = -Infinity;

      occupiedCells.forEach((key) => {
        const [col, row] = parseCellKey(key);
        cells.push({ col, row });
        minCol = Math.min(minCol, col);
        maxCol = Math.max(maxCol, col);
        minRow = Math.min(minRow, row);
        maxRow = Math.max(maxRow, row);
      });

      footprint.square_cells = cells;
      footprint.width_cells = maxCol - minCol + 1;
      footprint.height_cells = maxRow - minRow + 1;

      framing.center_x_cells = (minCol + maxCol) / 2;
      framing.center_y_cells = (minRow + maxRow) / 2;
      framing.extent_x_cells = (maxCol - minCol + 1) / 2;
      framing.extent_y_cells = (maxRow - minRow + 1) / 2;
    } else {
      const cells: TokenHexFootprintCell[] = [];
      let minQ = Infinity;
      let maxQ = -Infinity;
      let minR = Infinity;
      let maxR = -Infinity;

      occupiedCells.forEach((key) => {
        const [q, r] = parseHexCellKey(key);
        cells.push({ q, r });
        minQ = Math.min(minQ, q);
        maxQ = Math.max(maxQ, q);
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
      });

      footprint.hex_cells = cells;
      const maxExtent = Math.max(maxQ - minQ + 1, maxR - minR + 1);
      footprint.radius_cells = Math.ceil(maxExtent / 2);

      framing.max_extent_cells = maxExtent;
    }

    onConfirm({ footprint, framing });
  };

  const canConfirm = occupiedCells.size > 0;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Footprint Painter"
      className="z-[1100] px-0 pointer-events-none"
      boxClassName="max-w-6xl w-full h-[90vh] flex flex-col p-0 pointer-events-auto"
      closeOnBackdrop={false}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">
            Paint Token Footprint
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Click or drag to mark occupied cells. Save requires at least one
            cell.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setToolMode('brush')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                toolMode === 'brush'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Brush
            </button>
            <button
              type="button"
              onClick={() => setToolMode('eraser')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                toolMode === 'eraser'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Eraser
            </button>
          </div>
          <div className="text-sm text-slate-600">
            Occupied: {occupiedCells.size}{' '}
            {occupiedCells.size === 1 ? 'cell' : 'cells'}
          </div>
        </div>

        {/* Canvas Area */}
        <div className="relative flex-1 overflow-hidden">
          {!imageLoaded ? (
            <div className="flex h-full items-center justify-center">
              <span className="loading loading-spinner loading-lg text-slate-400" />
            </div>
          ) : (
            <>
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="absolute inset-0 cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseLeave}
              />
              {/* Overview Panel */}
              <div
                className="absolute rounded-lg border-2 border-slate-300 bg-white shadow-lg"
                style={{
                  top: OVERVIEW_MARGIN,
                  right: OVERVIEW_MARGIN,
                  width: OVERVIEW_SIZE,
                  height: OVERVIEW_SIZE,
                }}
              >
                <canvas
                  ref={overviewCanvasRef}
                  width={OVERVIEW_SIZE}
                  height={OVERVIEW_SIZE}
                  className="rounded-lg"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="btn btn-primary"
            title={!canConfirm ? 'Mark at least one cell to continue' : ''}
          >
            Confirm
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function drawSquareGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  occupiedCells: Set<CellKey>,
) {
  const cols = Math.ceil(width / cellSize);
  const rows = Math.ceil(height / cellSize);

  // Draw occupied cells
  ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
  occupiedCells.forEach((key) => {
    const [col, row] = parseCellKey(key);
    ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
  });

  // Draw grid lines
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let col = 0; col <= cols; col++) {
    const x = col * cellSize;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }

  for (let row = 0; row <= rows; row++) {
    const y = row * cellSize;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }

  ctx.stroke();
}

function drawHexGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize: number,
  occupiedCells: Set<CellKey>,
) {
  const hexWidth = Math.sqrt(3) * cellSize;
  const hexHeight = 2 * cellSize;
  const cols = Math.ceil(width / hexWidth) + 2;
  const rows = Math.ceil(height / (hexHeight * 0.75)) + 2;

  // Draw occupied cells
  ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
  occupiedCells.forEach((key) => {
    const [q, r] = parseHexCellKey(key);
    const [x, y] = hexToPixel(q, r, cellSize);
    drawHexagon(ctx, x, y, cellSize * 0.85);
  });

  // Draw grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 1;

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const q = col;
      const r = row - Math.floor(col / 2);
      const [x, y] = hexToPixel(q, r, cellSize);
      drawHexagonOutline(ctx, x, y, cellSize * 0.85);
    }
  }
}

function drawHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const hx = x + size * Math.cos(angle);
    const hy = y + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(hx, hy);
    } else {
      ctx.lineTo(hx, hy);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawHexagonOutline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const hx = x + size * Math.cos(angle);
    const hy = y + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(hx, hy);
    } else {
      ctx.lineTo(hx, hy);
    }
  }
  ctx.closePath();
  ctx.stroke();
}
