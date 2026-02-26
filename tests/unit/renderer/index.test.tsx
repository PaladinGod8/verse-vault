import { beforeEach, describe, expect, it, vi } from 'vitest';

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({
  render: renderMock,
}));

vi.mock('react-dom/client', () => ({
  createRoot: createRootMock,
}));

vi.mock('../../../src/renderer/App', () => ({
  default: () => <div>Mock App</div>,
}));

describe('renderer index', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('creates a root and renders the app router', async () => {
    await import('../../../src/renderer/index');

    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(createRootMock).toHaveBeenCalledWith(
      document.getElementById('root'),
    );
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
