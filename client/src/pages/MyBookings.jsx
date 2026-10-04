import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Button, Empty, Segmented, Skeleton, Tag, Typography } from 'antd';
import { bookingApi } from '../api';
import useAsync from '../hooks/useAsync';
import Poster from '../components/Poster';
import { formatDateTime, formatINR } from '../utils/format';

/** Booking history split into upcoming and past shows. */
export default function MyBookings() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const bookings = useAsync(() => bookingApi.mine().then((r) => r.data), []);

  /** Captured once per visit so the upcoming/past split stays stable across re-renders. */
  const [now] = useState(() => Date.now());
  const list = (bookings.data || []).filter((b) => {
    const upcoming = new Date(b.show?.startTime).getTime() >= now;
    return tab === 'upcoming' ? upcoming : !upcoming;
  });
  if (tab === 'upcoming') list.sort((a, b) => new Date(a.show.startTime) - new Date(b.show.startTime));

  return (
    <div className="container section narrow">
      <div className="catalogue-toolbar">
        <Typography.Title level={3} style={{ margin: 0 }}>
          My bookings
        </Typography.Title>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { label: 'Upcoming', value: 'upcoming' },
            { label: 'Past', value: 'past' },
          ]}
        />
      </div>

      {bookings.error && <Alert type="error" showIcon title={bookings.error.message} />}
      {bookings.loading && !bookings.data ? (
        <Skeleton active />
      ) : list.length ? (
        <ul className="booking-list">
          {list.map((b) => (
            <li key={b._id}>
              <Link to={`/bookings/${b._id}`} className="booking-item">
                <Poster src={b.movie?.posterUrl} title={b.movie?.title} className="booking-thumb" />
                <div className="booking-item-body">
                  <div className="booking-item-title">
                    {b.movie?.title} {b.status !== 'CONFIRMED' && <Tag color="orange">{b.status}</Tag>}
                  </div>
                  <div>{formatDateTime(b.show?.startTime)}</div>
                  <div className="muted">
                    {b.theatre?.name}, {b.theatre?.city} · Seats {b.seats.join(', ')}
                  </div>
                  <div className="muted">
                    {formatINR(b.totalAmount)} · {b.ticketCode}
                  </div>
                </div>
                <span className="booking-item-action">View ticket ›</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <Empty description={tab === 'upcoming' ? 'No upcoming bookings' : 'No past bookings'}>
          <Button type="primary" onClick={() => navigate('/')}>
            Book a movie
          </Button>
        </Empty>
      )}
    </div>
  );
}
