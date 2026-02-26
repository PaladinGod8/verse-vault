import { beforeEach, describe, expect, it } from 'vitest';
import { useExampleStore } from '../../../src/store/exampleStore';

describe('example store', () => {
  beforeEach(() => {
    useExampleStore.setState({ count: 0 });
  });

  it('starts at zero', () => {
    expect(useExampleStore.getState().count).toBe(0);
  });

  it('increments count', () => {
    useExampleStore.getState().increment();
    useExampleStore.getState().increment();

    expect(useExampleStore.getState().count).toBe(2);
  });
});
