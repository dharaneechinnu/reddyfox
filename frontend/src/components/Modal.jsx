import { useEffect, useRef } from 'react';
import { c } from '../tokens';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal dialog.
 *
 * Handles the things a hand-rolled dialog usually gets wrong: focus moves in
 * on open and back to the trigger on close, Tab is trapped inside, Escape and
 * a backdrop click both dismiss, and the page behind cannot scroll. Rendered
 * inline (no portal) — nothing in this app creates a stacking context that
 * would clip it, and it keeps the tree simple.
 */
export default function Modal({ open, onClose, labelledBy, children }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;

    // Focus the first real control, falling back to the panel itself so
    // screen readers announce the dialog rather than staying on the trigger.
    const panel = panelRef.current;
    const first = panel?.querySelector(FOCUSABLE);
    (first || panel)?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;

      const items = Array.from(panel?.querySelectorAll(FOCUSABLE) || []);
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];

      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Return focus so keyboard users aren't dumped back at the top of the page.
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(11,27,51,.55)', backdropFilter: 'blur(2px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '5vh 20px', overflowY: 'auto',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={{
          position: 'relative', width: '100%', maxWidth: 560,
          animation: 'fx-up .22s ease both', outline: 'none',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 1,
            width: 34, height: 34, borderRadius: '50%', border: `1px solid ${c.sandBorder}`,
            background: '#fff', color: c.textMuted, fontSize: 17, lineHeight: 1,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = c.sandCard; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
