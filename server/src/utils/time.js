/**
 * The platform operates in India, so "a day" in the UI means an IST calendar
 * day regardless of the server's timezone (Render runs in UTC).
 */
const IST_OFFSET = '+05:30';

/**
 * Returns the [start, end) instants of an IST calendar day.
 * @param {string} date YYYY-MM-DD
 */
function istDayRange(date) {
  const start = new Date(`${date}T00:00:00${IST_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Today's date in IST as YYYY-MM-DD. */
function todayIST() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

module.exports = { istDayRange, todayIST };
