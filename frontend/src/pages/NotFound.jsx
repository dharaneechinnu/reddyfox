import { useNavigate } from 'react-router-dom';
import { c, fonts } from '../tokens';
import Seo from '../components/Seo';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <section style={{ background: c.sand, padding: '140px 0' }}>
      <Seo title="Page Not Found" path="/404" noindex />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 32px', textAlign: 'center' }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 15, letterSpacing: '.2em', color: c.orange, marginBottom: 22 }}>ERROR 404</div>
        <h1 style={{ fontFamily: fonts.serif, fontWeight: 400, fontSize: 'clamp(36px,4.4vw,58px)', lineHeight: 1.08, color: c.navy, margin: '0 0 18px' }}>This page has been withdrawn from circulation</h1>
        <p style={{ fontSize: 17, lineHeight: 1.65, color: c.textMuted, margin: '0 0 34px' }}>The link may be out of date. The rate board, converter and branch list are all one click away.</p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span onClick={() => navigate('/')} style={{ background: c.orange, color: '#fff', padding: '15px 26px', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Back to home</span>
          <span onClick={() => navigate('/rates')} style={{ border: '1px solid #D5D0C8', color: c.navy, background: '#fff', padding: '15px 26px', borderRadius: 9, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Today's rates</span>
        </div>
      </div>
    </section>
  );
}
