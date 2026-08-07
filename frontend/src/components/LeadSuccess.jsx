import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { c, fs, fonts } from '../tokens';
import useApi from '../hooks/useApi';
import useOpenStatus from '../hooks/useOpenStatus';
import { fetchSiteSettings } from '../api';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import SocialIcon from './SocialIcon';
import SuccessTick from './SuccessTick';

// Module scope so useApi does not refetch on every render.
const loadSiteSettings = () => fetchSiteSettings();

// How quickly the desk aims to ring back during opening hours. Named once
// because it appears in the promise line and in the chip beside it — two
// places that must never disagree about the same commitment.
const CALLBACK_MINUTES = 15;

/**
 * The confirmation shown after any of the three lead forms succeeds: a small
 * dialog in the middle of the screen, over whatever the visitor was looking at.
 *
 * A centred dialog rather than a panel replacing the form, because the moment
 * of submitting is the one point where the visitor's attention should be in a
 * single place. It is deliberately small — the lead is already saved by the
 * time this renders, so this has one job: say when the call is coming, and
 * hand over the two ways to reach a person right now. Nothing is sold online;
 * the phone call is the product (see docs/team-notifications.md).
 *
 * The callback promise is written against the shop's real opening hours: if the
 * counter is shut when someone submits at eleven at night, this says when they
 * will actually hear back instead of promising fifteen minutes it cannot keep.
 * WhatsApp number, label and greeting come from the Django admin.
 *
 * Rendered into document.body with a portal so no ancestor's `overflow: hidden`
 * (the homepage hero's quote docket, for one) can clip it.
 */
export default function LeadSuccess({ heading, children, onReset, resetLabel = 'Send another request' }) {
  const { data: site } = useApi(loadSiteSettings, null);
  const { contact, primaryPhone, hours } = useCompanyInfo();
  const status = useOpenStatus(hours);
  const [open, setOpen] = useState(true);
  const dialog = useRef(null);

  // Closing hands the visitor back a blank form, so dismissing the dialog and
  // "send another" are the same action rather than two subtly different ones.
  const close = () => {
    setOpen(false);
    onReset?.();
  };

  useEffect(() => {
    if (!open) return undefined;
    dialog.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    // Stop the page scrolling behind the dialog.
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  // `status.detail` is a verb phrase already ("opens tomorrow at 9:30 AM"), so it
  // is joined with a subject of its own rather than after "we" — otherwise it
  // reads "when we opens tomorrow".
  const promise = status.known && !status.open
    ? `The counter is closed now — it ${status.detail || 'opens tomorrow'}. Your request is already with our team, and someone calls you then.`
    : `Someone from our team calls you on the number you gave us, usually within ${CALLBACK_MINUTES} minutes.`;

  return createPortal(
    <div
      role="presentation"
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0, 0, 0, .55)', backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Request received"
        tabIndex={-1}
        // Clicks inside must not reach the backdrop's close handler.
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative', width: '100%', maxWidth: 380,
          background: c.surface, border: `1px solid ${c.sandLine}`, borderRadius: 14,
          padding: '30px 24px 24px', textAlign: 'center', outline: 'none',
          boxShadow: '0 30px 60px -24px rgba(7,42,44,.5)',
          maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
        }}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          style={{ position: 'absolute', top: 10, right: 12, fontSize: fs['2xl'], lineHeight: 1, color: c.textFainter, padding: 4 }}
        >
          ×
        </button>

        <SuccessTick size={54} />

        <div style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs['3xl'], lineHeight: 1.15, color: c.navy, margin: '14px 0 8px' }}>{heading}</div>
        <div style={{ fontSize: fs.base, lineHeight: 1.6, color: c.textMuted, margin: '0 0 18px' }}>{children}</div>

        {/* The commitment, set apart — this is the line the visitor is deciding
            whether to trust. Neutral, with the time in gold: green here would be
            a fourth colour doing a job the words already do. */}
        <div style={{ background: c.page, border: `1px solid ${c.sandLine}`, borderRadius: 9, padding: '13px 14px', marginBottom: 18, textAlign: 'left', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          <span style={{ fontFamily: fonts.mono, fontSize: fs['2xs'], letterSpacing: '.1em', color: c.orange, border: `1px solid ${c.softLine}`, borderRadius: 4, padding: '4px 6px', flex: 'none', whiteSpace: 'nowrap' }}>
            {status.known && !status.open ? 'NEXT' : `${CALLBACK_MINUTES} MIN`}
          </span>
          <span style={{ fontSize: fs.sm, lineHeight: 1.55, color: c.text }}>{promise}</span>
        </div>

        <div style={{ display: 'grid', gap: 8 }}>
          <a
            href={`tel:${primaryPhone.tel}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: c.orange, color: c.surface, padding: 13, borderRadius: 8, fontSize: fs.md, fontWeight: 600, fontFamily: fonts.mono }}
          >
            Call {primaryPhone.display}
          </a>
          {site?.whatsapp_enabled && site?.whatsapp_url && (
            <a
              href={site.whatsapp_url}
              target="_blank"
              rel="noreferrer noopener"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, background: c.whatsapp, color: c.surface, padding: 13, borderRadius: 8, fontSize: fs.md, fontWeight: 600 }}
            >
              <SocialIcon name="whatsapp" size={18} />
              {site.whatsapp_display || site.whatsapp_label || 'Chat on WhatsApp'}
            </a>
          )}
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', fontSize: fs.sm }}>
          <a href={`mailto:${contact.email}`} style={{ color: c.textMuted }}>{contact.email}</a>
          <button type="button" onClick={close} style={{ fontSize: fs.sm, fontWeight: 600, color: c.orange }}>
            {resetLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
