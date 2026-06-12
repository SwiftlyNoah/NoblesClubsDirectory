import { useEffect, useRef, type PropsWithChildren, type ReactNode } from 'react';
import './Modal.css';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  /** max-width of the card; defaults to 640px. */
  width?: number;
}

export function Modal({ open, onClose, title, width = 640, children }: PropsWithChildren<ModalProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="app-modal"
      style={{ maxWidth: width }}
      onMouseDown={(event) => {
        // Backdrop click: the dialog element itself is the target only when
        // the click lands outside the card content.
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="app-modal-body">
        {title !== undefined && (
          <div className="app-modal-header">
            <h3 className="app-modal-title">{title}</h3>
            <button className="app-modal-close" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>
        )}
        {children}
      </div>
    </dialog>
  );
}
