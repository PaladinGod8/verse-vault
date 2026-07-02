/**
 * @role IPA tool open/close controller
 * @owns The session-scoped open state for the IPA phonetic drawer and the
 *       drawer mount point. Kept mounted so staging contents survive close/reopen.
 * @seam `useIpaTool().open()` is called from the world sidebar trigger
 */
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import IpaToolDrawer from '../components/ipa/IpaToolDrawer';

type IpaToolContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

const noop = (): void => undefined;

const fallbackIpaToolContext: IpaToolContextValue = {
  isOpen: false,
  open: noop,
  close: noop,
  toggle: noop,
};

const IpaToolContext = createContext<IpaToolContextValue | undefined>(undefined);

export function IpaToolProvider({ children }: { children: ReactNode; }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((current) => !current), []);

  const value = useMemo<IpaToolContextValue>(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle],
  );

  return (
    <IpaToolContext.Provider value={value}>
      {children}
      {/* Always mounted so the staging box keeps its contents across close/reopen. */}
      <IpaToolDrawer isOpen={isOpen} onClose={close} />
    </IpaToolContext.Provider>
  );
}

/** Access the IPA tool controls. Returns a no-op fallback outside the provider. */
export function useIpaTool() {
  return useContext(IpaToolContext) ?? fallbackIpaToolContext;
}
