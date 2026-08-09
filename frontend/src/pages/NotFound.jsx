import { useNavigate } from 'react-router-dom';
import { c, fs, fonts, btnPrimary, btnGhost } from '../tokens';
import Seo from '../components/Seo';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <section style={{ background: c.page, padding: '140px 0' }}>
      <Seo title="Page Not Found" path="/404" noindex />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.mono, fontSize: fs.md, letterSpacing: '.2em', color: c.pageEyebrow, marginBottom: 22 }}>ERROR 404</div>
        <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: fs.h1, lineHeight: 1.08, color: c.pageHeading, margin: '0 0 18px' }}>This page has been withdrawn from circulation</h1>
        <p style={{ fontSize: fs.xl, lineHeight: 1.65, color: c.pageText, margin: '0 0 34px' }}>The link may be out of date. The rate board, converter and branch list are all one click away.</p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span onClick={() => navigate('/')} style={{ ...btnPrimary, borderRadius: 9 }}>Back to home</span>
          <span onClick={() => navigate('/rates')} style={{ ...btnGhost(true), borderRadius: 9 }}>Today's rates</span>
        </div>
      </div>
    </section>
  );
}
