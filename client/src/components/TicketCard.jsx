import { Tag } from 'antd';
import Poster from './Poster';
import { formatDateTime, formatINR } from '../utils/format';

const STATUS_COLOR = { CONFIRMED: 'green', REFUNDED: 'orange', FAILED: 'red', PENDING: 'blue' };

/**
 * Printable e-ticket: movie and venue on the left, QR code and booking id on
 * a perforated stub on the right.
 */
export default function TicketCard({ booking }) {
  const { movie, theatre, show } = booking;
  return (
    <div className="ticket">
      <div className="ticket-main">
        <Poster src={movie.posterUrl} title={movie.title} className="ticket-poster" />
        <div className="ticket-info">
          <div className="ticket-title">
            {movie.title} <Tag>{movie.certificate}</Tag>
          </div>
          <div className="muted">
            {show.language} · {show.format}
          </div>
          <div className="ticket-when">{formatDateTime(show.startTime)}</div>
          <div>
            <strong>{theatre.name}</strong>
          </div>
          <div className="muted">
            {theatre.address}, {theatre.city}
          </div>
          <div className="ticket-seats">
            <span className="muted">Screen {show.screen} · Seats</span>
            <div>
              {booking.seats.map((s) => (
                <Tag key={s} color="magenta">
                  {s}
                </Tag>
              ))}
            </div>
          </div>
          <div className="ticket-amounts">
            <span>Tickets {formatINR(booking.ticketAmount)}</span>
            <span>Convenience fee {formatINR(booking.convenienceFee)}</span>
            <strong>Paid {formatINR(booking.totalAmount)}</strong>
          </div>
        </div>
      </div>

      <div className="ticket-stub">
        <Tag color={STATUS_COLOR[booking.status]}>{booking.status}</Tag>
        {booking.qrCode ? (
          <img className="ticket-qr" src={booking.qrCode} alt="Ticket QR code" />
        ) : (
          <div className="ticket-qr placeholder">QR unavailable</div>
        )}
        <div className="muted">BOOKING ID</div>
        <div className="ticket-code">{booking.ticketCode || '—'}</div>
        {booking.checkedInAt && <Tag color="purple">Admitted</Tag>}
      </div>
    </div>
  );
}
