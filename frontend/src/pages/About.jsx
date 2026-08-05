import { Link } from 'react-router-dom';
import { CERTS, REASONS } from '../data';
import { COMPANY } from '../company';
import { c, fs, fonts, wrap } from '../tokens';
import Seo from '../components/Seo';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import SitePhoto from '../components/SitePhoto';

export default function About() {
  const { contact } = useCompanyInfo();
  return (
    <div>
      <Seo
        title="About Us"
        description={`${COMPANY.yearsExperience} years as an RBI-authorised money changer in T. Nagar, Chennai — serving private and corporate clients since ${COMPANY.since}.`}
        path="/about"
      />
      <section style={{ background: c.orange, padding: '60px 0 88px' }}>
        <div style={wrap}>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.sm, lineHeight: 1.4, color: c.navyMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.onNavyText }}>Home</Link> / About
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.04, color: c.surface, margin: '0 0 18px', maxWidth: 820 }}>
            {COMPANY.yearsExperience} years as an authorised money changer in Chennai
          </h1>
          <p style={{ fontSize: fs.xl, lineHeight: 1.62, color: c.onNavyText, margin: 0, maxWidth: 620 }}>
            Providing a wide range of foreign currency exchange and related services for both private
            and corporate clients since {COMPANY.since}, {COMPANY.shortName} has established itself as a
            successful and respected currency exchange company.
          </p>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '88px 0' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 56, alignItems: 'start' }}>
          <SitePhoto
            slot="about_counter"
            placeholderLabel={<>PHOTOGRAPHY<br />The counter at Challa Mall, T. Nagar</>}
            style={{ minHeight: 420 }}
          />
          <div>
            <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.orange, margin: '0 0 14px' }}>Welcome to {COMPANY.shortName}</p>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h3, lineHeight: 1.1, color: c.navy, margin: '0 0 20px' }}>
              Best money exchangers in Chennai
            </h2>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.textMuted, margin: '0 0 16px' }}>
              {COMPANY.shortName} is one of the most reputed foreign currency exchanges in Chennai, because
              we specialise in offering the whole gamut of foreign currency exchange services — money
              exchange, money transfer services and money remittance services.
            </p>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.textMuted, margin: '0 0 16px' }}>
              We offer a broad spectrum of services to the public, corporates and travel agents that
              include buy/sell foreign exchange, encashing travellers' cheques, travel currency cards,
              Western Union money transfer, and foreign remittances for overseas education, family
              maintenance, immigration, medical treatment and attending conferences, seminars and
              trade fairs.
            </p>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.textMuted, margin: '0 0 32px' }}>
              We undertake to buy and sell foreign currencies and en-cash travellers cheques as per RBI
              guidelines, offering an array of value added customer service at best competitive rates.
            </p>
            <div className="fx-stack-480" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, borderTop: `1px solid ${c.sandBorder}`, paddingTop: 26 }}>
              <div>
                <h3 style={{ fontSize: fs.md, fontWeight: 600, color: c.navy, margin: '0 0 8px' }}>Mission</h3>
                <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.textMuted, margin: 0 }}>{COMPANY.mission}</p>
              </div>
              <div>
                <h3 style={{ fontSize: fs.md, fontWeight: 600, color: c.navy, margin: '0 0 8px' }}>Vision</h3>
                <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.textMuted, margin: 0 }}>{COMPANY.vision}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '88px 0' }}>
        <div style={wrap}>
          <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.orange, margin: '0 0 14px' }}>Why us?</p>
          <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h3, lineHeight: 1.1, color: c.navy, margin: '0 0 16px' }}>
            A solution provider for your foreign exchange needs
          </h2>
          <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.textMuted, margin: '0 0 44px', maxWidth: 700 }}>
            We are a solution provider for your foreign exchange needs on your upcoming travel. We will
            always commit and provide 100% satisfaction in terms of price and service.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 24 }}>
            {REASONS.map((r) => (
              <div key={r.n} style={{ borderTop: `2px solid ${c.navy}`, paddingTop: 20 }}>
                <div style={{ fontFamily: fonts.mono, fontSize: fs.md, color: c.orange, marginBottom: 12 }}>{r.n}</div>
                <h3 style={{ fontSize: fs.xl, fontWeight: 600, color: c.navy, margin: '0 0 8px' }}>{r.title}</h3>
                <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.text, margin: 0 }}>{r.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: c.sand, padding: '88px 0' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 56, alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.orange, margin: '0 0 14px' }}>Our team</p>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h3, lineHeight: 1.1, color: c.navy, margin: '0 0 20px' }}>
              Trained, experienced and multilingual
            </h2>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.textMuted, margin: '0 0 16px' }}>
              Our company is represented by committed, qualified, highly trained, experienced and
              multilingual front office staff to address the specific needs of the customers in a highly
              professional manner. In fact our rates are considered to be the most competitive in the market.
            </p>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.textMuted, margin: 0 }}>
              Our company was approved by the RBI to carry out foreign exchange transactions. We value our
              clients as business partners and are dedicated to providing the highest quality of service
              to them.
            </p>
          </div>
          <SitePhoto
            slot="about_team"
            placeholderLabel={<>PHOTOGRAPHY<br />Front office team</>}
            style={{ minHeight: 340 }}
          />
        </div>
      </section>

      <section style={{ background: c.sand, borderTop: `1px solid ${c.sandLine}`, padding: '80px 0' }}>
        <div style={wrap}>
          <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.accent, margin: '0 0 32px' }}>Compliance</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 18 }}>
            {CERTS.map((cert) => (
              <div key={cert.title} style={{ border: '1px solid rgba(255,255,255,.14)', borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: fs.md, fontWeight: 600, color: c.surface, marginBottom: 8 }}>{cert.title}</div>
                <div style={{ fontSize: fs.base, lineHeight: 1.6, color: c.navyMuted2 }}>{cert.body}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, borderTop: '1px solid rgba(255,255,255,.12)', paddingTop: 28, display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: fs.sm, color: c.navyMuted2, marginBottom: 6 }}>Visit us</div>
              <div style={{ fontSize: fs.md, color: c.surface, lineHeight: 1.6 }}>
                {contact.addressLines.join(' ')} {contact.addressNote}
              </div>
            </div>
            <div>
              <div style={{ fontSize: fs.sm, color: c.navyMuted2, marginBottom: 6 }}>Call us</div>
              <div style={{ fontFamily: fonts.mono, fontSize: fs.md, color: c.surface }}>
                {contact.mobiles.map((m) => m.display).join(' · ')}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
