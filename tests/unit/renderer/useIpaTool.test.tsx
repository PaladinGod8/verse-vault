import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { IpaToolProvider, useIpaTool } from '../../../src/renderer/hooks/useIpaTool';

function Probe() {
  const { isOpen, open, close, toggle } = useIpaTool();
  return (
    <div>
      <span>open:{String(isOpen)}</span>
      <button type='button' onClick={open}>do-open</button>
      <button type='button' onClick={close}>do-close</button>
      <button type='button' onClick={toggle}>do-toggle</button>
    </div>
  );
}

describe('useIpaTool', () => {
  it('opens, closes, and toggles the drawer state', async () => {
    const user = userEvent.setup();
    render(
      <IpaToolProvider>
        <Probe />
      </IpaToolProvider>,
    );

    expect(screen.getByText('open:false')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'do-open' }));
    expect(screen.getByText('open:true')).toBeVisible();
    expect(screen.getByLabelText('IPA staging')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'do-close' }));
    expect(screen.getByText('open:false')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'do-toggle' }));
    expect(screen.getByText('open:true')).toBeVisible();
  });

  it('returns a safe no-op fallback when used outside the provider', async () => {
    const user = userEvent.setup();
    render(<Probe />);

    expect(screen.getByText('open:false')).toBeVisible();
    // Clicking must not throw even though there is no provider.
    await user.click(screen.getByRole('button', { name: 'do-open' }));
    expect(screen.getByText('open:false')).toBeVisible();
  });
});
