import { Link } from 'react-router-dom';
import { CERTS, REASONS } from '../data';
import { COMPANY } from '../company';
import { c, fs, fonts, wrap } from '../tokens';
import Seo from '../components/Seo';
import Reveal from '../components/Reveal';
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
      <section style={{ background: c.page, padding: '60px 0 88px' }}>
        <div style={wrap}>
          <div style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.sm, lineHeight: 1.4, color: c.pageMuted, marginBottom: 22 }}>
            <Link to="/" style={{ cursor: 'pointer', color: c.pageEyebrow }}>Home</Link> / About
          </div>
          <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.04, color: c.pageHeading, margin: '0 0 18px', maxWidth: 820 }}>
            {COMPANY.yearsExperience} years changing money in Chennai, approved by the RBI
          </h1>
          <p style={{ fontSize: fs.xl, lineHeight: 1.62, color: c.pageText, margin: 0, maxWidth: 620 }}>
            We have been changing foreign money — and doing everything that goes with it — for people
            and companies since {COMPANY.since}. In that time {COMPANY.shortName} has become a name
            people in Chennai trust.
          </p>
        </div>
      </section>

      <section style={{ background: c.page, padding: '88px 0' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 56, alignItems: 'start' }}>
          <SitePhoto
            slot="about_counter"
            placeholderLabel={<>PHOTOGRAPHY<br />The counter at Challa Mall, T. Nagar</>}
            style={{ minHeight: 420 }}
          />
          <div>
            <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.pageEyebrow, margin: '0 0 14px' }}>Welcome to {COMPANY.shortName}</p>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h3, lineHeight: 1.1, color: c.pageHeading, margin: '0 0 20px' }}>
              Best money exchangers in Chennai
            </h2>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.pageText, margin: '0 0 16px' }}>
              {COMPANY.shortName} is one of the best known money exchangers in Chennai. That is because we
              do the whole job under one roof — changing money, sending money, and moving money
              abroad.
            </p>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.pageText, margin: '0 0 16px' }}>
              We look after the public, companies and travel agents. We buy and sell foreign money, cash
              travellers' cheques, do travel cards and Western Union money transfers, and send money
              abroad for studies, for family, for moving abroad, for medical treatment, and for
              conferences, seminars and trade fairs.
            </p>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.pageText, margin: '0 0 32px' }}>
              We buy and sell foreign money and cash travellers cheques following RBI rules, and we give
              you extra help and service on top of a good rate.
            </p>
            <div className="fx-stack-480" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, borderTop: `1px solid ${c.pageLine}`, paddingTop: 26 }}>
              <div>
                <h3 style={{ fontSize: fs.md, fontWeight: 600, color: c.pageHeading, margin: '0 0 8px' }}>Mission</h3>
                <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.pageText, margin: 0 }}>{COMPANY.mission}</p>
              </div>
              <div>
                <h3 style={{ fontSize: fs.md, fontWeight: 600, color: c.pageHeading, margin: '0 0 8px' }}>Vision</h3>
                <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.pageText, margin: 0 }}>{COMPANY.vision}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ background: c.page, padding: '88px 0' }}>
        <div style={wrap}>
          <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.pageEyebrow, margin: '0 0 14px' }}>Why us?</p>
          <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h3, lineHeight: 1.1, color: c.pageHeading, margin: '0 0 16px' }}>
            We sort out whatever you need with foreign money
          </h2>
          <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.pageText, margin: '0 0 44px', maxWidth: 700 }}>
            Whatever you need for your next trip abroad, we will sort it out. We promise to get both the
            price and the service right for you, every time.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 24 }}>
            {REASONS.map((r, i) => (
              <Reveal
                key={r.n}
                delay={i * 0.09}
                className="fx-hover-lift-panel"
                style={{
                  background: c.panel,
                  border: `1px solid ${c.navyLine}`,
                  borderRadius: 14,
                  padding: 'clamp(22px,2.4vw,28px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ fontFamily: fonts.mono, fontSize: fs.md, color: c.accent, marginBottom: 14 }}>{r.n}</div>
                <h3 style={{ fontSize: fs.xl, fontWeight: 600, color: c.surface, margin: '0 0 8px' }}>{r.title}</h3>
                <p style={{ fontSize: fs.base, lineHeight: 1.62, color: c.onNavyText, margin: 0 }}>{r.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section style={{ background: c.page, padding: '88px 0' }}>
        <div style={{ ...wrap, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))', gap: 56, alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.pageEyebrow, margin: '0 0 14px' }}>Our team</p>
            <h2 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h3, lineHeight: 1.1, color: c.pageHeading, margin: '0 0 20px' }}>
              Trained, experienced, and we speak your language
            </h2>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.pageText, margin: '0 0 16px' }}>
              The people at our counter are qualified, well trained and experienced, and they speak
              several languages. They take your problem seriously and sort it out properly. Our rates are
              considered to be among the most competitive in the market.
            </p>
            <p style={{ fontSize: fs.lg, lineHeight: 1.7, color: c.pageText, margin: 0 }}>
              The RBI has approved us to deal in foreign money. We treat our customers as partners, and we
              work hard to give them the best service we can.
            </p>
          </div>
          <SitePhoto
            slot="about_team"
            placeholderLabel={<>PHOTOGRAPHY<br />Front office team</>}
            style={{ minHeight: 340 }}
          />
        </div>
      </section>

      <section style={{ background: c.page, borderTop: `1px solid ${c.pageLine}`, padding: '80px 0' }}>
        <div style={wrap}>
          <p style={{ fontFamily: fonts.mono, fontWeight: 500, fontSize: fs.xs, lineHeight: 1.4, letterSpacing: '.18em', textTransform: 'uppercase', color: c.pageEyebrow, margin: '0 0 32px' }}>Compliance</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(260px,100%),1fr))', gap: 18 }}>
            {CERTS.map((cert) => (
              <div key={cert.title} className="fx-hover-lift-panel" style={{ background: c.panel, border: `1px solid ${c.navyLine}`, borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: fs.md, fontWeight: 600, color: c.surface, marginBottom: 8 }}>{cert.title}</div>
                <div style={{ fontSize: fs.base, lineHeight: 1.6, color: c.navyMuted2 }}>{cert.body}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 40, borderTop: `1px solid ${c.pageLine}`, paddingTop: 28, display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: fs.sm, color: c.pageMuted, marginBottom: 6 }}>Visit us</div>
              <div style={{ fontSize: fs.md, color: c.pageHeading, lineHeight: 1.6 }}>
                {contact.addressLines.join(' ')} {contact.addressNote}
              </div>
            </div>
            <div>
              <div style={{ fontSize: fs.sm, color: c.pageMuted, marginBottom: 6 }}>Call us</div>
              <div style={{ fontFamily: fonts.mono, fontSize: fs.md, color: c.pageHeading }}>
                {contact.mobiles.map((m) => m.display).join(' · ')}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
