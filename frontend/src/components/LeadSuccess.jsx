import { Link } from 'react-router-dom';
import { CONTACT, PRIMARY_PHONE } from '../company';
import { c, fonts } from '../tokens';
import useApi from '../hooks/useApi';
import { fetchSiteSettings } from '../api';
import SocialIcon from './SocialIcon';

// Module scope so useApi does not refetch on every render.
const loadSiteSettings = () => fetchSiteSettings();

/**
 * Shown after any of the three forms succeeds.
 * WhatsApp number, label and greeting come from the Django admin.
 */
export default function LeadSuccess({ heading, children, onReset, resetLabel = 'Send another request', reference }) {
  const { data: site } = useApi(loadSiteSettings, null);

  return (
    <div role="status" style={{ background: '#fff', border: `1px solid ${c.greenBorder}`, borderRadius: 16, padding: 34 }}>
      <div style={{ fontSize: 20, fontWeight: 600, color: c.greenText, margin: '0 0 10px' }}>{heading}</div>
      <div style={{ fontSize: 15, lineHeight: 1.65, color: c.text, margin: '0 0 22px' }}>{children}</div>

      {reference && (
        <div style={{ border: `1px solid ${c.sandBorder}`, background: c.sand, borderRadius: 12, padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11.5, color: c.textMuted, marginBottom: 4 }}>Your reference — save this</div>
            <div style={{ fontFamily: fonts.mono, fontSize: 19, fontWeight: 600, color: c.navy, letterSpacing: '.03em' }}>{reference}</div>
          </div>
          <Link
            to={`/track?reference=${encodeURIComponent(reference)}`}
            style={{ fontSize: 13.5, fontWeight: 600, color: c.orange, whiteSpace: 'nowrap' }}
          >
            Track this request →
          </Link>
        </div>
      )}

      {/* WhatsApp leads: it is the fastest channel for most customers. */}
      {site?.whatsapp_enabled && site?.whatsapp_url && (
        <div style={{ border: `1px solid ${c.greenBorder}`, background: c.greenBg2, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: c.greenText, marginBottom: 4 }}>
            Want to talk to us personally?
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: c.greenText2, margin: '0 0 14px' }}>
            Message us directly on WhatsApp and one of our team will reply to you.
          </p>
          <a
            href={site.whatsapp_url}
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#25D366', color: '#fff', padding: 15, borderRadius: 9, fontSize: 15, fontWeight: 600, textDecoration: 'none' }}
          >
            <SocialIcon name="whatsapp" size={19} />
            {site.whatsapp_label || 'Chat with us on WhatsApp'}
          </a>
          {site.whatsapp_display && (
            <div style={{ marginTop: 10, textAlign: 'center', fontFamily: fonts.mono, fontSize: 14, color: c.greenText }}>
              {site.whatsapp_display}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <a
          href={`tel:${PRIMARY_PHONE.tel}`}
          style={{ display: 'block', textAlign: 'center', background: c.orange, color: '#fff', padding: 15, borderRadius: 9, fontSize: 15, fontWeight: 600, fontFamily: fonts.mono }}
        >
          Call {PRIMARY_PHONE.display}
        </a>
        <a
          href={`mailto:${CONTACT.email}`}
          style={{ display: 'block', textAlign: 'center', border: `1px solid ${c.softLine}`, color: c.navy, padding: 15, borderRadius: 9, fontSize: 15, fontWeight: 600 }}
        >
          Email {CONTACT.email}
        </a>
      </div>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          style={{ marginTop: 18, fontSize: 13.5, fontWeight: 600, color: c.orange }}
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
}
