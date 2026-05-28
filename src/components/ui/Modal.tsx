"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl shadow-xl p-0 max-w-md w-full backdrop:bg-black/40 open:flex open:flex-col"
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      {title && (
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors text-xl leading-none"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
      )}
      <div className="px-6 pb-6 pt-2">{children}</div>
    </dialog>
  );
}
