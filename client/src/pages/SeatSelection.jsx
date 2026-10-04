import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Alert, App, Button, Card, Divider, Result, Skeleton, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, ClockCircleOutlined, LockOutlined } from '@ant-design/icons';
import { paymentApi, showApi } from '../api';
import http from '../api/http';
import useAsync from '../hooks/useAsync';
import useShowSocket from '../hooks/useShowSocket';
import SeatMap from '../components/SeatMap';
import Countdown from '../components/Countdown';
import { selectUser } from '../store/authSlice';
import { formatDateTime, formatINR } from '../utils/format';
import { openRazorpayCheckout } from '../utils/razorpay';

const MAX_SEATS = 10;
/** Must match CONVENIENCE_FEE_PER_TICKET on the server; the server's figure is authoritative. */
const FEE_PER_TICKET = 25;

/**
 * Seat selection and checkout.
 *
 * 1. Customer picks seats on a live map (other customers' holds and sales
 *    stream in over Socket.IO).
 * 2. "Proceed" places a server-side hold for a few minutes.
 * 3. "Pay" opens Razorpay Checkout; the server verifies the signature and
 *    atomically books the seats before the ticket page is shown.
 */
export default function SeatSelection() {
  const { id } = useParams();
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const location = useLocation();
  const { message, modal } = App.useApp();

  const show = useAsync(() => showApi.get(id).then((r) => r.data), [id]);
  const [booked, setBooked] = useState(() => new Set());
  const [held, setHeld] = useState(() => new Set());
  const [selected, setSelected] = useState(() => new Set());
  const [hold, setHold] = useState(null);
  const [busy, setBusy] = useState(false);
  const [paying, setPaying] = useState(false);

  /** Refs give unmount/pagehide handlers and socket callbacks the latest values. */
  const selectedRef = useRef(selected);
  const holdRef = useRef(null);
  const paidRef = useRef(false);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    holdRef.current = hold;
  }, [hold]);

  const refreshSeats = useCallback(async () => {
    const { data } = await showApi.seats(id);
    const nextBooked = new Set(data.booked);
    const nextHeld = new Set(data.held.filter((h) => !h.mine).map((h) => h.seat));
    setBooked(nextBooked);
    setHeld(nextHeld);

    const lost = [...selectedRef.current].filter((s) => nextBooked.has(s) || nextHeld.has(s));
    if (lost.length && !holdRef.current) {
      message.warning(`Seat ${lost.join(', ')} was just taken by someone else`);
      setSelected((prev) => new Set([...prev].filter((s) => !lost.includes(s))));
    }
    return data;
  }, [id, message]);

  /**
   * On first load, restore a hold the customer still owns (e.g. after a page
   * refresh mid-checkout) by re-holding the same seats to get fresh pricing.
   */
  useEffect(() => {
    let cancelled = false;
    /* oxlint-disable-next-line react/set-state-in-effect -- state is only set after the network request resolves */
    refreshSeats()
      .then(async (data) => {
        const mine = data.held.filter((h) => h.mine).map((h) => h.seat);
        if (!mine.length || cancelled) return;
        const res = await showApi.hold(id, mine);
        if (cancelled) return;
        setSelected(new Set(res.data.seats));
        setHold(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, refreshSeats]);

  /** Socket events trigger a debounced re-sync rather than patching local state by hand. */
  const syncTimer = useRef(null);
  useShowSocket(id, () => {
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => refreshSeats().catch(() => {}), 250);
  });
  useEffect(() => () => clearTimeout(syncTimer.current), []);

  /** Release the hold if the customer leaves without paying. */
  useEffect(() => {
    const releaseOnExit = () => {
      if (!holdRef.current || paidRef.current) return;
      const base = http.defaults.baseURL;
      fetch(`${base}/shows/${id}/hold`, { method: 'DELETE', credentials: 'include', keepalive: true }).catch(() => {});
    };
    window.addEventListener('pagehide', releaseOnExit);
    return () => {
      window.removeEventListener('pagehide', releaseOnExit);
      releaseOnExit();
    };
  }, [id]);

  const priceBySeat = useMemo(() => {
    const map = new Map();
    show.data?.seatLayout.categories.forEach((c) =>
      c.rows.forEach((r) => {
        for (let n = 1; n <= show.data.seatLayout.seatsPerRow; n += 1) map.set(`${r}${n}`, { category: c.name, price: c.price });
      }),
    );
    return map;
  }, [show.data]);

  const toggleSeat = useCallback(
    (seatId) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(seatId)) next.delete(seatId);
        else if (next.size >= MAX_SEATS) {
          message.info(`You can book up to ${MAX_SEATS} seats at a time`);
          return prev;
        } else next.add(seatId);
        return next;
      });
    },
    [message],
  );

  const proceed = async () => {
    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setBusy(true);
    try {
      const res = await showApi.hold(id, [...selected]);
      setHold(res.data);
    } catch (err) {
      message.error(err.message);
      refreshSeats().catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  const changeSeats = async () => {
    setBusy(true);
    try {
      await showApi.release(id);
    } finally {
      setHold(null);
      setBusy(false);
      refreshSeats().catch(() => {});
    }
  };

  const onHoldExpired = useCallback(() => {
    setHold(null);
    setSelected(new Set());
    message.warning('Your seat hold expired. Please select your seats again.');
    refreshSeats().catch(() => {});
  }, [message, refreshSeats]);

  /** Stand-in checkout used when the server runs without Razorpay keys (local development). */
  const mockCheckout = (order) =>
    new Promise((resolve, reject) => {
      modal.confirm({
        title: 'Test payment',
        icon: <LockOutlined />,
        content: (
          <>
            <p>
              Payment gateway keys are not configured on this server, so payments are simulated. No money is
              charged.
            </p>
            <p>
              Amount: <strong>{formatINR(order.amount)}</strong>
            </p>
          </>
        ),
        okText: `Pay ${formatINR(order.amount)}`,
        cancelText: 'Cancel',
        onOk: () =>
          resolve({ orderId: order.order.id, paymentId: `pay_mock_${Date.now()}`, signature: 'mock_signature' }),
        onCancel: () => reject(Object.assign(new Error('Payment cancelled'), { cancelled: true })),
      });
    });

  const pay = async () => {
    setPaying(true);
    let orderId;
    try {
      const { data } = await paymentApi.createOrder(id, hold.seats);
      orderId = data.order.id;
      if (data.holdExpiresAt) setHold((h) => ({ ...h, expiresAt: data.holdExpiresAt }));

      const payment = data.mock
        ? await mockCheckout(data)
        : await openRazorpayCheckout({
            keyId: data.keyId,
            order: data.order,
            prefill: data.prefill,
            description: `${show.data.movie.title} · ${hold.seats.join(', ')}`,
          });

      const verified = await paymentApi.verify(payment);
      paidRef.current = true;
      navigate(`/bookings/${verified.data._id}?new=1`, { replace: true });
    } catch (err) {
      if (err.cancelled) {
        if (orderId) paymentApi.cancel(orderId).catch(() => {});
        message.info('Payment cancelled. Your seats are still held for you.');
      } else {
        message.error(err.message);
        if (err.status === 409) {
          setHold(null);
          refreshSeats().catch(() => {});
        }
      }
    } finally {
      setPaying(false);
    }
  };

  if (show.error) {
    return (
      <Result
        status="warning"
        title="This show is no longer available"
        subTitle={show.error.message}
        extra={<Button onClick={() => navigate('/')}>Browse movies</Button>}
      />
    );
  }
  if (!show.data) return <Skeleton active className="container section" />;

  const s = show.data;
  const seats = hold ? hold.seats : [...selected].sort();
  const lines = seats.map((seat) => ({ seat, ...priceBySeat.get(seat) }));
  const ticketTotal = hold ? hold.total : lines.reduce((sum, l) => sum + (l.price || 0), 0);
  const fee = FEE_PER_TICKET * seats.length;
  const byCategory = lines.reduce((acc, l) => {
    acc[l.category] = acc[l.category] || { count: 0, amount: 0 };
    acc[l.category].count += 1;
    acc[l.category].amount += l.price;
    return acc;
  }, {});

  return (
    <>
      <div className="booking-bar">
        <div className="container booking-bar-inner">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/movies/${s.movie._id}`)} />
          <div>
            <div className="booking-bar-title">
              {s.movie.title} <Tag>{s.movie.certificate}</Tag>
            </div>
            <div className="muted">
              {s.theatre.name}, {s.theatre.city} · {formatDateTime(s.startTime)} · Screen {s.screen} · {s.language}{' '}
              {s.format}
            </div>
          </div>
        </div>
      </div>

      <div className="container section seat-layout">
        <Card className="seat-map-card">
          <SeatMap
            layout={s.seatLayout}
            booked={booked}
            held={held}
            selected={selected}
            onToggle={toggleSeat}
            disabled={Boolean(hold) || busy}
          />
        </Card>

        <Card className="summary-card" title={hold ? 'Complete your booking' : 'Your selection'}>
          {hold && (
            <Alert
              type="warning"
              showIcon
              icon={<ClockCircleOutlined />}
              style={{ marginBottom: 16 }}
              message={
                <span>
                  Seats held for you for <Countdown until={hold.expiresAt} onExpire={onHoldExpired} />
                </span>
              }
            />
          )}

          {seats.length === 0 ? (
            <Typography.Paragraph type="secondary">Tap on seats to select them. Up to {MAX_SEATS} per booking.</Typography.Paragraph>
          ) : (
            <>
              <div className="summary-seats">
                {seats.map((seat) => (
                  <Tag key={seat} color="magenta">
                    {seat}
                  </Tag>
                ))}
              </div>
              {Object.entries(byCategory).map(([category, { count, amount }]) => (
                <div className="summary-line" key={category}>
                  <span>
                    {category} × {count}
                  </span>
                  <span>{formatINR(amount)}</span>
                </div>
              ))}
              <div className="summary-line muted">
                <span>Convenience fee ({formatINR(FEE_PER_TICKET)} × {seats.length})</span>
                <span>{formatINR(fee)}</span>
              </div>
              <Divider style={{ margin: '12px 0' }} />
              <div className="summary-line summary-total">
                <span>Total</span>
                <span>{formatINR(ticketTotal + fee)}</span>
              </div>
            </>
          )}

          {hold ? (
            <>
              <Button type="primary" size="large" block loading={paying} onClick={pay} icon={<LockOutlined />}>
                Pay {formatINR(ticketTotal + fee)}
              </Button>
              <Button block type="link" onClick={changeSeats} disabled={paying}>
                Change seats
              </Button>
            </>
          ) : (
            <Button type="primary" size="large" block disabled={Boolean(user) && !seats.length} loading={busy} onClick={proceed}>
              {user ? `Proceed${seats.length ? ` · ${seats.length} seat${seats.length > 1 ? 's' : ''}` : ''}` : 'Sign in to book'}
            </Button>
          )}
        </Card>
      </div>
    </>
  );
}
