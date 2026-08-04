import useApi from '../hooks/useApi';
import { fetchSiteImages } from '../api';
import { c, fs, fonts } from '../tokens';

// Module scope so useApi doesn't refetch this on every render, and every
// SitePhoto instance on a page shares one request instead of one each.
const loadSiteImages = () => fetchSiteImages();

/**
 * A photo slot that may or may not have a staff upload behind it yet.
 * Renders the real photo (Django admin -> Content -> Site images) when one
 * exists and is visible; otherwise falls back to the existing decorative
 * placeholder swatch, unchanged, so a page never looks broken before staff
 * get around to uploading anything.
 */
export default function SitePhoto({ slot, placeholderLabel, style, imgFit = 'cover' }) {
  const { data: images } = useApi(loadSiteImages, {});
  const image = images[slot];

  const boxStyle = {
    border: `1px solid ${c.sandBorder4}`,
    borderRadius: 16,
    overflow: 'hidden',
    ...style,
  };

  if (image) {
    return (
      <div style={boxStyle}>
        <img
          src={image.url}
          alt={image.alt_text}
          style={{ width: '100%', height: '100%', objectFit: imgFit, display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div style={{
      background: `repeating-linear-gradient(135deg,${c.swatch} 0 10px,${c.swatch2} 10px 20px)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      ...boxStyle,
    }}>
      <span style={{ fontFamily: fonts.mono, fontWeight: 400, fontSize: fs.xs, lineHeight: 1.7, letterSpacing: '.14em', color: c.swatchText, textAlign: 'center' }}>
        {placeholderLabel}
      </span>
    </div>
  );
}
