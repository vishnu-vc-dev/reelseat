import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** All show times are presented in IST, whatever the viewer's device timezone. */
export const TZ = 'Asia/Kolkata';

export const ist = (date) => dayjs(date).tz(TZ);

export const formatTime = (date) => ist(date).format('hh:mm A');

export const formatDate = (date) => ist(date).format('ddd, D MMM YYYY');

export const formatDateTime = (date) => ist(date).format('ddd, D MMM · hh:mm A');

export const formatDuration = (minutes) => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

export const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

/** YYYY-MM-DD for today + offset days, in IST. */
export const istDateString = (offset = 0) => ist(dayjs()).add(offset, 'day').format('YYYY-MM-DD');

export { dayjs };
