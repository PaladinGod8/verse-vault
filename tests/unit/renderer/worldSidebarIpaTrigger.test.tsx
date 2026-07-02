import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ToastProvider } from '../../../src/renderer/components/ui/ToastProvider';
import WorldSidebar from '../../../src/renderer/components/worlds/WorldSidebar';
import { IpaToolProvider } from '../../../src/renderer/hooks/useIpaTool';

describe('WorldSidebar IPA trigger', () => {
  it('opens the IPA tool drawer when the sidebar button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastProvider>
          <IpaToolProvider>
            <WorldSidebar worldId={1} />
          </IpaToolProvider>
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(screen.queryByLabelText('IPA staging')).toBeNull();

    await user.click(screen.getByRole('button', { name: /ipa/i }));

    expect(screen.getByLabelText('IPA staging')).toBeVisible();
  });
});
