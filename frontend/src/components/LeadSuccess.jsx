import { c, fs, fonts } from '../tokens';
import useApi from '../hooks/useApi';
import { fetchSiteSettings } from '../api';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import SocialIcon from './SocialIcon';

// Module scope so useApi does not refetch on every render.
const loadSiteSettings = () => fetchSiteSettings();

/**
 * Shown after any of the three forms succeeds.
 * WhatsApp number, label and greeting come from the Django admin.
 */
export default function LeadSuccess({ heading, children, onReset, resetLabel = 'Send another request' }) {
  const { data: site } = useApi(loadSiteSettings, null);
  const { contact, primaryPhone } = useCompanyInfo();

  return (
    <div role="status" style={{ background: c.surface, border: `1px solid ${c.greenBorder}`, borderRadius: 16, padding: 34 }}>
      <div style={{ fontSize: fs['2xl'], fontWeight: 600, color: c.greenText, margin: '0 0 10px' }}>{heading}</div>
      <div style={{ fontSize: fs.md, lineHeight: 1.65, color: c.text, margin: '0 0 22px' }}>{children}</div>

      {/* WhatsApp leads: it is the fastest channel for most customers. */}
      {site?.whatsapp_enabled && site?.whatsapp_url && (
        <div style={{ border: `1px solid ${c.greenBorder}`, background: c.greenBg2, borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: fs.base, fontWeight: 600, color: c.greenText, marginBottom: 4 }}>
            Want to talk to us personally?
          </div>
          <p style={{ fontSize: fs.base, lineHeight: 1.55, color: c.greenText2, margin: '0 0 14px' }}>
            Message us directly on WhatsApp and one of our team will reply to you.
          </p>
          <a
            href={site.whatsapp_url}
            target="_blank"
            rel="noreferrer noopener"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: c.whatsapp, color: c.surface, padding: 15, borderRadius: 9, fontSize: fs.md, fontWeight: 600, textDecoration: 'none' }}
          >
            <SocialIcon name="whatsapp" size={19} />
            {site.whatsapp_label || 'Chat with us on WhatsApp'}
          </a>
          {site.whatsapp_display && (
            <div style={{ marginTop: 10, textAlign: 'center', fontFamily: fonts.mono, fontSize: fs.base, color: c.greenText }}>
              {site.whatsapp_display}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <a
          href={`tel:${primaryPhone.tel}`}
          style={{ display: 'block', textAlign: 'center', background: c.orange, color: c.surface, padding: 15, borderRadius: 9, fontSize: fs.md, fontWeight: 600, fontFamily: fonts.mono }}
        >
          Call {primaryPhone.display}
        </a>
        <a
          href={`mailto:${contact.email}`}
          style={{ display: 'block', textAlign: 'center', border: `1px solid ${c.softLine}`, color: c.navy, padding: 15, borderRadius: 9, fontSize: fs.md, fontWeight: 600 }}
        >
          Email {contact.email}
        </a>
      </div>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          style={{ marginTop: 18, fontSize: fs.base, fontWeight: 600, color: c.orange }}
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
}
