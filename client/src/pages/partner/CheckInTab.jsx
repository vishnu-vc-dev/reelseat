import { useCallback, useRef, useState } from 'react';
import { Alert, Button, Card, Descriptions, Input, Result, Space, Tag } from 'antd';
import { CameraOutlined, ScanOutlined } from '@ant-design/icons';
import QrScanner from '../../components/QrScanner';
import { partnerApi } from '../../api';
import { formatDateTime } from '../../utils/format';

/**
 * Gate check-in. Works with the device camera, a USB/Bluetooth barcode
 * scanner (which types the QR payload and presses Enter) or a typed booking id.
 */
export default function CheckInTab() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [camera, setCamera] = useState(false);
  const inputRef = useRef(null);

  const checkIn = useCallback(async (value) => {
    if (!value.trim()) return;
    setLoading(true);
    try {
      const res = await partnerApi.checkIn(value.trim());
      setResult({ ok: true, booking: res.data });
    } catch (err) {
      setResult({ ok: false, message: err.message, booking: err.details?.booking });
    } finally {
      setLoading(false);
      setCode('');
      inputRef.current?.focus();
    }
  }, []);

  const submit = () => checkIn(code);

  const b = result?.booking;

  return (
    <Card>
      <Space.Compact style={{ width: '100%', maxWidth: 560 }}>
        <Input
          ref={inputRef}
          size="large"
          autoFocus
          prefix={<ScanOutlined />}
          placeholder="Scan QR or type booking id (e.g. RS-1A2B3C4D)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onPressEnter={submit}
        />
        <Button size="large" type="primary" loading={loading} onClick={submit}>
          Admit
        </Button>
      </Space.Compact>
      <Button
        icon={<CameraOutlined />}
        style={{ marginTop: 12 }}
        type={camera ? 'default' : 'dashed'}
        onClick={() => setCamera((on) => !on)}
      >
        {camera ? 'Stop camera' : 'Scan with camera'}
      </Button>
      {camera && <QrScanner onScan={checkIn} />}

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
