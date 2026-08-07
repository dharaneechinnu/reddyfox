/**
 * The world, dotted — decoration behind the homepage hero.
 *
 * The mask below is real geography, not a sketch: Natural Earth's 110m land
 * polygons (via the public-domain `world-atlas` dataset) sampled onto a
 * 110 x 44 equirectangular grid of 3.27° cells, from 84°N down to 60°S, and
 * run-length encoded to the column ranges that are land. Antarctica is off
 * the bottom, as it is on most maps used this way. One dot per land cell.
 *
 * Baking it in as data rather than shipping a map library or an image keeps
 * this to a few hundred bytes gzipped, with no extra request and nothing to
 * fail at runtime. The grid is coarse on purpose — at the size this sits
 * behind a headline it should read as "the world", not invite squinting at
 * coastlines.
 *
 * Purely decorative: `aria-hidden`, no labels, no markers. Reddy Forex has one
 * counter in T. Nagar, so a map with pins on it would say something untrue.
 *
 * Colour and weight come from the caller, so the same component works on the
 * indigo hero panel (translucent white) as it would on cream.
 */

// [row]: the column ranges that are land. Column 0 starts at 180°W; row 0 is
// centred on 82.4°N. Regenerated from land-110m.json if the grid ever changes.
const LAND = [
  [[29, 35], [39, 39], [41, 47]],
  [[23, 23], [26, 27], [29, 31], [34, 48], [58, 60], [84, 86]],
  [[19, 20], [22, 22], [24, 24], [27, 27], [37, 48], [73, 74], [83, 89], [97, 98]],
  [[17, 22], [24, 25], [28, 29], [38, 47], [71, 71], [76, 76], [80, 93], [98, 98]],
  [[5, 12], [14, 23], [25, 26], [29, 29], [32, 34], [39, 46], [60, 64], [73, 74], [76, 76], [78, 105], [107, 109]],
  [[0, 2], [4, 28], [32, 33], [35, 35], [39, 43], [48, 50], [59, 65], [68, 109]],
  [[5, 26], [29, 29], [40, 41], [57, 59], [61, 109]],
  [[6, 7], [12, 25], [31, 33], [35, 35], [57, 60], [63, 101], [104, 104]],
  [[6, 6], [15, 27], [32, 35], [53, 53], [57, 57], [61, 96], [103, 104]],
  [[16, 29], [31, 37], [52, 52], [54, 54], [56, 98]],
  [[16, 35], [37, 37], [54, 98]],
  [[17, 36], [55, 63], [65, 65], [67, 96], [98, 98]],
  [[17, 32], [52, 55], [58, 58], [60, 63], [67, 95], [98, 98]],
  [[17, 31], [52, 54], [61, 61], [63, 93]],
  [[18, 31], [53, 53], [55, 57], [65, 91], [94, 94], [97, 97]],
  [[19, 30], [52, 57], [66, 91], [95, 95]],
  [[21, 27], [29, 29], [52, 91]],
  [[20, 24], [30, 30], [51, 64], [66, 69], [71, 91]],
  [[21, 24], [50, 65], [67, 72], [76, 90]],
  [[23, 24], [27, 27], [31, 31], [50, 65], [67, 72], [77, 80], [83, 86]],
  [[24, 27], [50, 66], [68, 70], [77, 79], [84, 87]],
  [[28, 28], [50, 68], [78, 79], [85, 87], [92, 92]],
  [[29, 29], [32, 35], [51, 70], [78, 78], [87, 87], [91, 91]],
  [[31, 36], [51, 69], [79, 79], [85, 85], [93, 93]],
  [[31, 38], [58, 68], [84, 84], [86, 86], [90, 90]],
  [[31, 39], [58, 67], [85, 86], [88, 90], [92, 92]],
  [[31, 41], [58, 66], [86, 86], [89, 91], [95, 95], [97, 97]],
  [[30, 43], [59, 66], [87, 87], [97, 100]],
  [[31, 43], [59, 66], [100, 100]],
  [[32, 42], [59, 66], [95, 96], [98, 98]],
  [[32, 42], [59, 66], [69, 69], [93, 96], [98, 98]],
  [[34, 42], [59, 65], [69, 69], [92, 99]],
  [[34, 41], [59, 65], [68, 69], [90, 100]],
  [[33, 39], [60, 64], [90, 101]],
  [[33, 39], [60, 64], [90, 101]],
  [[33, 38], [61, 63], [90, 93], [96, 101]],
  [[33, 37], [97, 100]],
  [[33, 36], [108, 108]],
  [[32, 34], [99, 99], [107, 107]],
  [[32, 34], [106, 106]],
  [[32, 34]],
  [[32, 33], [36, 36]],
  [[33, 33]],
];

const COLS = 110;
const ROWS = LAND.length;
const DOT_R = 0.36;

/**
 * All ~1,450 dots as one <path> rather than that many <circle> elements: it is
 * a single DOM node, and the browser has no per-element layout to do for a
 * backdrop that never changes. Each dot is two arcs closing a circle.
 */
const DOTS_PATH = LAND.flatMap((ranges, row) =>
  ranges.flatMap(([from, to]) => {
    const d = [];
    for (let col = from; col <= to; col += 1) {
      const cx = col + 0.5;
      const cy = row + 0.5;
      d.push(`M${cx - DOT_R} ${cy}a${DOT_R} ${DOT_R} 0 1 0 ${DOT_R * 2} 0a${DOT_R} ${DOT_R} 0 1 0 ${-DOT_R * 2} 0`);
    }
    return d;
  }),
).join('');

export default function WorldMapBackdrop({ color, opacity = 1, style }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${COLS} ${ROWS}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block', opacity, ...style }}
    >
      <path d={DOTS_PATH} fill={color} />
    </svg>
  );
}
