import { useRef, useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, Result, Space, Tag } from 'antd';
import { ScanOutlined } from '@ant-design/icons';
import { partnerApi } from '../../api';
import { formatDateTime } from '../../utils/format';

/**
 * Gate check-in. Works with a USB/Bluetooth barcode scanner (which types the
 * QR payload and presses Enter) or by typing the booking id manually.
 */
export default function CheckInTab() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  const submit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const res = await partnerApi.checkIn(code.trim());
      setResult({ ok: true, booking: res.data });
    } catch (err) {
      setResult({ ok: false, message: err.message, booking: err.details?.booking });
    } finally {
      setLoading(false);
      setCode('');
      inputRef.current?.focus();
    }
  };

  const b = result?.booking;

  return (
    <Card>
      <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
        <Input
          ref={inputRef}
          size="large"
          autoFocus
          prefix={<ScanOutlined />}
          placeholder="Scan QR or type booking id (e.g. BMS-1A2B3C4D)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onPressEnter={submit}
        />
        <Button size="large" type="primary" loading={loading} onClick={submit}>
          Admit
        </Button>
      </Space.Compact>

      {result && (
        <Result
          status={result.ok ? 'success' : 'error'}
          title={result.ok ? 'Admit' : 'Do not admit'}
          subTitle={result.ok ? `${b.seats.length} guest(s) · Seats ${b.seats.join(', ')}` : result.message}
          style={{ paddingBottom: 0 }}
        />
      )}

      {b && (
        <Descriptions bordered size="small" column={1} style={{ maxWidth: 560, margin: '0 auto' }}>
          <Descriptions.Item label="Booking">{b.ticketCode}</Descriptions.Item>
          <Descriptions.Item label="Customer">{b.user?.name}</Descriptions.Item>
          <Descriptions.Item label="Movie">{b.movie?.title}</Descriptions.Item>
          <Descriptions.Item label="Show">
            {formatDateTime(b.show?.startTime)} · Screen {b.show?.screen}
          </Descriptions.Item>
          <Descriptions.Item label="Seats">
            {b.seats.map((s) => (
              <Tag key={s}>{s}</Tag>
            ))}
          </Descriptions.Item>
        </Descriptions>
      )}

      {!result && (
        <Alert
          style={{ marginTop: 16, maxWidth: 560 }}
          type="info"
          showIcon
          title="Each ticket can be admitted once. Re-scans and tickets for other theatres are rejected."
        />
      )}
    </Card>
  );
}
