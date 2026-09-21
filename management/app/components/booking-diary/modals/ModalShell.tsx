import type { ReactNode } from 'react';

export function ModalShell({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <>
      <button type="button" className="modal-scrim" aria-label="Close dialog" onClick={onClose} />
      <dialog open className="booking-dialog">
        <div className="dialog-heading">
          <h2>{title}</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
