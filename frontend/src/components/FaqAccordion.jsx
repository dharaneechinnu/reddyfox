import { useState } from 'react';
import { c, fs } from '../tokens';

/**
 * Accordion driven by FAQ records from the API.
 * `answer_html` is rich text authored by staff in Wagtail, so it is rendered
 * as HTML. Wagtail restricts the editor to bold/italic/link/lists and only
 * authenticated staff can write it, so this is trusted content.
 */
export default function FaqAccordion({ faqs = [], maxWidth, padding = '22px 28px', answerPadding = '0 28px 24px' }) {
  const [open, setOpen] = useState(0);

  if (!faqs.length) return null;

  return (
    <div style={{ background: c.surface, border: `1px solid ${c.sandLine}`, borderRadius: 14, overflow: 'hidden' }}>
      {faqs.map((f, i) => (
        <div key={f.id} style={{ borderBottom: `1px solid ${c.sandLine3}` }}>
          <div
            onClick={() => setOpen(open === i ? -1 : i)}
            style={{ padding, display: 'flex', justifyContent: 'space-between', gap: 24, cursor: 'pointer', alignItems: 'center' }}
          >
            <span style={{ fontSize: fs.lg, fontWeight: 600, color: c.navy }}>{f.question}</span>
            <span style={{ fontSize: fs['2xl'], color: c.orange, flex: 'none' }}>{open === i ? '−' : '+'}</span>
          </div>
          {open === i && (
            <div
              style={{ padding: answerPadding, fontSize: fs.md, lineHeight: 1.68, color: c.textMuted, maxWidth: maxWidth || 760 }}
              className="fx-richtext"
              dangerouslySetInnerHTML={{ __html: f.answer_html }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
