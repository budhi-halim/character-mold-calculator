// === DATE UTILS ===
export function isLeapYear(year) {
  return new Date(year, 1, 29).getDate() === 29;
}

// Get 1-based day index (1 to 366), exactly matching original logic
export function getDayIndex(date) {
  // Use noon to avoid timezone/DST shift issues
  const start = new Date(date.getFullYear(), 0, 1, 12, 0, 0);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  let diff = Math.floor((target - start) / 86400000) + 1;

  // Leap year adjustment: skip Feb 29 logic (index 60) for non-leap years
  if (!isLeapYear(date.getFullYear()) && diff >= 60) {
    diff += 1;
  }

  return diff;
}

// === ENCODER ===
function encodeSegment(val, chars, len, reverse) {
  const base = chars.length;
  let out = "";

  for (let i = 0; i < len; i++) {
    let idx = val % base;
    if (reverse) idx = base - 1 - idx;
    out = chars[idx] + out;
    val = Math.floor(val / base);
  }

  return out;
}

// === MAIN TRANSLATION LOGIC ===
export function formToCode(date, shift, loc, revY, revD, revSL) {
  const chars = "0123456789"; // Base 10 exact string

  // Year: modulo cycle based on the alphabet length
  const y = date.getFullYear() % 10;
  
  // Day: 1-indexed for Base10
  const d = getDayIndex(date);

  // Shift & Location: Combined base 9 logic
  const sl = shift * 3 + loc;

  return (
    encodeSegment(y, chars, 1, revY) +
    encodeSegment(d, chars, 3, revD) +
    encodeSegment(sl, chars, 1, revSL)
  );
}

// Formats date to DDMMYY
export function formatExpDateString(date) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}