import useApi from '../hooks/useApi';
import { fetchSiteSettings } from '../api';
import SocialIcon from './SocialIcon';

// Module scope so useApi does not refetch on every render.
const loadSiteSettings = () => fetchSiteSettings();

/**
 * Persistent bottom-right WhatsApp icon, shown on every page. Number, label
 * and greeting all come from the Django admin (Content -> Site settings) —
 * untick "Show WhatsApp option" there and this disappears everywhere,
 * including the post-enquiry prompt in LeadSuccess.jsx.
 */
export default function WhatsAppButton() {
  const { data: site } = useApi(loadSiteSettings, null);

  if (!site?.whatsapp_enabled || !site?.whatsapp_url) return null;

  return (
    <a
      href={site.whatsapp_url}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={site.whatsapp_label || 'Chat with us on WhatsApp'}
      title={site.whatsapp_label || 'Chat with us on WhatsApp'}
      style={{
        width: 56, height: 56, borderRadius: '50%', background: '#25D366', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 18px 30px -14px rgba(11,27,51,.6)', transition: 'transform .18s',
        textDecoration: 'none', flex: 'none',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
    >
      <SocialIcon name="whatsapp" size={28} />
    </a>
  );
}
