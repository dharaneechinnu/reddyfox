import { Link, useSearchParams } from 'react-router-dom';
import { c, fs, fonts, wrap } from '../tokens';
import RequestForm from '../components/RequestForm';
import Seo from '../components/Seo';
import { useCompanyInfo } from '../context/CompanyInfoContext';

export default function Quote() {
  const { contact } = useCompanyInfo();
  const [searchParams] = useSearchParams();
  const initialService = searchParams.get('service') || undefined;
  return (
    <div>
      <Seo
        title="Get a Free Forex Quote"
        description="Tell Reddy Forex which currency and amount you need and our T. Nagar, Chennai dealers will come back with a price — no obligation."
        path="/quote"
      />
      <section style={{ background: c.orange, padding: '60px 0 72px' }}>
        <div style={wrap}>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.sm, lineHeight: 1.4, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / Get a quote
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.05, color: c.surface, margin: '0 0 14px' }}>
            Get a free quote
          </h1>
          <p style={{ fontSize: fs.lg, lineHeight: 1.6, color: c.onNavyText, margin: 0, maxWidth: 560 }}>
            Tell us the currency and amount you need and one of our dealers will come back to you with a price.
          </p>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '64px 0 96px' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 24, alignItems: 'start' }}>
          <RequestForm kind="quote" initialService={initialService} />

          <div style={{ background: c.navy, borderRadius: 16, padding: 32, color: c.surface }}>
            <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.16em', color: c.accent, margin: '0 0 22px' }}>
              WHAT HAPPENS NEXT
            </p>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 14, fontSize: fs.base, lineHeight: 1.6, color: c.onNavyText2 }}>
              <li>A dealer reviews your request against the current board.</li>
              <li>We come back to you on the phone number or email you gave us.</li>
              <li>If you are happy with the price, we tell you which documents to bring.</li>
            </ol>

            <div style={{ borderTop: '1px solid rgba(255,255,255,.14)', marginTop: 26, paddingTop: 22 }}>
              <div style={{ fontSize: fs.sm, color: c.navyMuted2, marginBottom: 8 }}>Rather ask us directly?</div>
              {contact.mobiles.slice(0, 2).map((m) => (
                <a key={m.tel} href={`tel:${m.tel}`} style={{ display: 'block', fontFamily: fonts.mono, fontSize: fs.lg, color: c.surface, marginBottom: 6 }}>
                  {m.display}
                </a>
              ))}
              <a href={`mailto:${contact.email}`} style={{ fontSize: fs.base, color: c.onNavyLink }}>{contact.email}</a>
            </div>

            <p style={{ fontSize: fs.sm, lineHeight: 1.6, color: c.navyMuted2, margin: '22px 0 0' }}>
              Cash purchases above ₹50,000 require PAN. Card and remittance limits apply under the LRS scheme.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
