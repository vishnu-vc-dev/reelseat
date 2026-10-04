import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, App, Button, Popconfirm, Result, Skeleton, Space, Typography } from 'antd';
import { CloseCircleOutlined, PrinterOutlined, TagsOutlined } from '@ant-design/icons';
import { bookingApi } from '../api';
import useAsync from '../hooks/useAsync';
import TicketCard from '../components/TicketCard';
import { formatDateTime, formatINR } from '../utils/format';

/** Single e-ticket. `?new=1` is set right after payment to show the success banner. */
export default function BookingDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [cancelling, setCancelling] = useState(false);
  const booking = useAsync(() => bookingApi.get(id).then((r) => r.data), [id]);

  if (booking.error) {
    return <Result status="404" title="Booking not found" extra={<Button onClick={() => navigate('/bookings')}>My bookings</Button>} />;
  }
  if (!booking.data) return <Skeleton active className="container section" />;

  const b = booking.data;
  const terms = b.cancellation;

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await bookingApi.cancel(b._id);
      message.success(res.message);
      booking.reload();
    } catch (err) {
      message.error(err.message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="container section ticket-page">
      {params.get('new') && b.status === 'CONFIRMED' && (
        <Result
          status="success"
          title="Booking confirmed!"
          subTitle={`Your e-ticket ${b.ticketCode} has been emailed to you. Show the QR code at the entrance.`}
          className="no-print"
        />
      )}
      {b.status === 'REFUNDED' && (
        <Alert
          type="warning"
          showIcon
          className="no-print"
          style={{ marginBottom: 16 }}
          title="This booking was refunded"
          description={b.failureReason}
        />
      )}
      {b.status === 'CANCELLED' && (
        <Alert
          type="info"
          showIcon
          className="no-print"
          style={{ marginBottom: 16 }}
          title={`Cancelled on ${formatDateTime(b.cancelledAt)}`}
          description={
            b.refundAmount
              ? `${formatINR(b.refundAmount)} is being refunded to your original payment method (5–7 working days).`
              : 'No refund was due for this cancellation.'
          }
        />
      )}

      <TicketCard booking={b} />

      <Space className="no-print" style={{ marginTop: 16 }} wrap>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()} disabled={b.status !== 'CONFIRMED'}>
          Print ticket
        </Button>
        <Button icon={<TagsOutlined />} onClick={() => navigate('/bookings')}>
          All bookings
        </Button>
        {terms?.allowed && (
          <Popconfirm
            title="Cancel this booking?"
            description={`You will get ${formatINR(terms.refundAmount)} back (${terms.refundPercent}% of the ticket price). The convenience fee is not refundable.`}
            okText="Cancel booking"
            okButtonProps={{ danger: true }}
            cancelText="Keep it"
            onConfirm={cancel}
          >
            <Button danger icon={<CloseCircleOutlined />} loading={cancelling}>
              Cancel booking
            </Button>
          </Popconfirm>
        )}
      </Space>

      {b.status === 'CONFIRMED' && terms && (
        <Typography.Paragraph type="secondary" className="no-print" style={{ marginTop: 12 }}>
          {terms.allowed
            ? `Free cancellation of the ticket amount up to 24 hours before the show, 75% up to ${formatDateTime(terms.deadline)}.`
            : terms.reason}
        </Typography.Paragraph>
      )}
    </div>
  );
}
