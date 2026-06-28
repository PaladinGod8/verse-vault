import type { ReactNode } from 'react';

type EditorActionBarProps = {
  children: ReactNode;
  className?: string;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function EditorActionBar({
  children,
  className,
}: EditorActionBarProps) {
  return (
    <div
      data-testid='editor-action-bar'
      className={joinClasses(
        'sticky top-0 z-10 -mx-1 mb-4 flex justify-end gap-2 border-b border-slate-200 bg-base-100/95 px-1 pb-3 pt-1 backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  );
}
