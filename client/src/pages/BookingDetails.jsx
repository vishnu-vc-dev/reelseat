import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Result, Skeleton, Space } from 'antd';
import { PrinterOutlined, TagsOutlined } from '@ant-design/icons';
import { bookingApi } from '../api';
import useAsync from '../hooks/useAsync';
import TicketCard from '../components/TicketCard';

/** Single e-ticket. `?new=1` is set right after payment to show the success banner. */
export default function BookingDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const booking = useAsync(() => bookingApi.get(id).then((r) => r.data), [id]);

  if (booking.error) {
    return <Result status="404" title="Booking not found" extra={<Button onClick={() => navigate('/bookings')}>My bookings</Button>} />;
  }
  if (!booking.data) return <Skeleton active className="container section" />;

  const b = booking.data;
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

      <TicketCard booking={b} />

      <Space className="no-print" style={{ marginTop: 16 }}>
        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
          Print ticket
        </Button>
        <Button icon={<TagsOutlined />} onClick={() => navigate('/bookings')}>
          All bookings
        </Button>
      </Space>
    </div>
  );
}
