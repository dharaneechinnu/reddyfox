import { c, fs, fonts, wrap, sectionY, stamp, btnPrimary, btnGhost } from '../tokens';
import { useCompanyInfo } from '../context/CompanyInfoContext';
import SectionHead from './SectionHead';
import OpenStatus, { HoursTable } from './OpenStatus';

/**
 * Where the shop is, when it is open, and how to reach it.
 *
 * There is one counter and everything happens across it, so this block is the
 * closest thing the site has to a product page. It answers the three questions
 * a walk-in actually has, in the order they have them: are you open, where are
 * you, and what do I dial.
 *
 * No embedded map: an iframe from a third party on every page load, to show a
 * pin at an address already printed above it, is not worth what it costs the
 * visitor. The directions link hands the address to whichever maps app they
 * already use.
 */
export default function VisitCounter() {
  const { contact } = useCompanyInfo();
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(contact.addressOneLine)}`;

  return (
    <section style={{ background: c.page, ...sectionY, borderTop: `1px solid ${c.navyLine}` }}>
      <div style={wrap}>
        <SectionHead
          label="Visit the counter"
          title="One shop, one counter, in T. Nagar"
          aside="Everything we do happens here in person — rates quoted, notes counted, documents checked across the same counter."
        />

        <div className="fx-visit-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(24px,3vw,36px)', alignItems: 'stretch' }}>
          {/* Hours first: it is the one thing that decides whether the rest matters today. */}
          <div className="fx-hover-lift" style={{ border: `1px solid ${c.sandLine}`, borderRadius: 10, padding: 'clamp(24px,3vw,34px)', background: c.surface }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
              <span style={{ ...stamp, color: c.textFaint }}>Opening hours</span>
              <OpenStatus tone="light" />
            </div>
            <HoursTable tone="light" />
            <p style={{ fontSize: fs.sm, lineHeight: 1.6, color: c.textFaint, margin: '18px 0 0' }}>
              Times are Chennai local time. Call ahead for a large amount so the notes are counted and ready when you arrive.
            </p>
          </div>

          {/* The address, set as the largest thing in the block — it is what
              someone screenshots before they set off. */}
          <div className="fx-hover-lift" style={{ background: c.navy, borderRadius: 10, padding: 'clamp(24px,3vw,34px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 26 }}>
            <div>
              <span style={{ ...stamp, color: c.accent }}>The shop</span>
              <p style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs['3xl'], lineHeight: 1.25, color: c.surface, margin: '16px 0 10px' }}>
                {contact.addressLines.map((line) => <span key={line} style={{ display: 'block' }}>{line}</span>)}
              </p>
              {contact.addressNote && (
                <p style={{ fontSize: fs.md, color: c.onNavyText, margin: 0 }}>{contact.addressNote}</p>
              )}
            </div>

            <div>
              <div style={{ ...stamp, color: c.navyMuted2, marginBottom: 10 }}>Call the counter</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', marginBottom: 22 }}>
                {contact.mobiles.map((m) => (
                  <a key={m.tel} href={`tel:${m.tel}`} style={{ display: 'inline-block', padding: '4px 0', fontFamily: fonts.mono, fontSize: fs.md, color: c.surface }}>{m.display}</a>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href={directionsUrl} target="_blank" rel="noreferrer noopener" style={btnPrimary}>Get directions</a>
                <a href={`tel:${contact.mobiles[0]?.tel}`} style={btnGhost(true)}>Call now</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
