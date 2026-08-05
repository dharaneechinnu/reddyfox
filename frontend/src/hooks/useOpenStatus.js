import { useEffect, useState } from 'react';

/**
 * "Is the counter open right now?", kept current between fetches.
 *
 * The API already answers this once, in Chennai time, when the site settings
 * load (see content.SiteSetting.is_open_now). That answer goes stale the moment
 * the clock ticks past closing, and this site is a single-page app someone may
 * leave open for hours — so this recomputes it from the published opening times
 * every minute rather than trusting the flag that arrived on page load.
 *
 * The shop's own timezone is used throughout, never the visitor's: someone
 * checking from Dubai or Singapore before a trip needs to know whether the
 * T. Nagar counter is open, not whether it would be open where they are.
 * Intl does that conversion, so there is no date library here.
 *
 * Mirrors the server's rules deliberately, including reading a closing time
 * that lands before its opening time as closing after midnight. If those rules
 * change, both this and SiteSetting.is_open_now need the change — the same
 * keep-them-in-step arrangement as validation.js and content/validators.py.
 */

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

// "09:30" -> 570 minutes past midnight. null for anything unparseable, which
// callers treat the same as a closed day.
function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// 570 -> "9:30 AM". A shop sign, not a timestamp — matches the server's
// SiteSetting._clock so the badge and the hours table read identically.
export function clockLabel(hhmm) {
  const total = toMinutes(hhmm);
  if (total === null) return '';
  const h24 = Math.floor(total / 60) % 24;
  const hour = h24 % 12 || 12;
  return `${hour}:${String(total % 60).padStart(2, '0')} ${h24 < 12 ? 'AM' : 'PM'}`;
}

// The current weekday and time at the shop, whatever the visitor's own clock says.
function nowAtShop(timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  return {
    // Some engines render midnight as hour 24 under hour12:false.
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
    day: WEEKDAY_INDEX[get('weekday')] ?? 1,
  };
}

const spanFor = (hours, day) => (day === 0 ? hours?.sunday : hours?.weekday);

function isWithin(span, minutes) {
  const opens = toMinutes(span?.opens);
  const closes = toMinutes(span?.closes);
  if (span?.closed || opens === null || closes === null) return false;
  // A closing time at or before the opening time means the shift runs past midnight.
  return closes <= opens ? minutes >= opens || minutes < closes : minutes >= opens && minutes < closes;
}

// When the counter next opens, phrased the way someone planning a trip reads it:
// a time if that is today, otherwise the day it happens.
function nextOpening(hours, { day, minutes }) {
  const today = spanFor(hours, day);
  const todayOpens = toMinutes(today?.opens);
  if (!today?.closed && todayOpens !== null && minutes < todayOpens) {
    return `opens ${clockLabel(today.opens)} today`;
  }
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const nextDay = (day + ahead) % 7;
    const span = spanFor(hours, nextDay);
    if (span?.closed || !span?.opens) continue;
    const when = ahead === 1 ? 'tomorrow' : DAY_NAMES[nextDay];
    return `opens ${when} at ${clockLabel(span.opens)}`;
  }
  return '';
}

export default function useOpenStatus(hours) {
  // Recomputed on a timer rather than derived inline so the badge changes over
  // at opening and closing time without the visitor reloading the page.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  if (!hours?.weekday) return { known: false, open: false, label: '', detail: '' };

  void tick; // the timer's only job is to re-run the calculation below
  const now = nowAtShop(hours.timezone || 'Asia/Kolkata');
  const open = isWithin(spanFor(hours, now.day), now.minutes);
  const closes = spanFor(hours, now.day)?.closes;

  return {
    known: true,
    open,
    label: open ? 'Open now' : 'Closed',
    detail: open ? `closes ${clockLabel(closes)}` : nextOpening(hours, now),
  };
}
