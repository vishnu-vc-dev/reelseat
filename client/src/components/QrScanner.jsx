import { useEffect, useId, useRef, useState } from 'react';
import { Alert } from 'antd';

/**
 * Camera QR scanner. Uses the rear camera on phones; the library is loaded
 * only when the scanner is opened, keeping it out of the main bundle.
 * Each distinct code is reported once until a different code is seen,
 * so holding a ticket in front of the camera does not re-submit it.
 *
 * @param {{ onScan: (text: string) => void }} props
 */
export default function QrScanner({ onScan }) {
  const elementId = `qr-${useId().replace(/:/g, '')}`;
  const [error, setError] = useState('');
  const lastScan = useRef('');
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let scanner;
    let stopped = false;

    import('html5-qrcode')
      .then(({ Html5Qrcode }) => {
        if (stopped) return undefined;
        scanner = new Html5Qrcode(elementId);
        return scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (text === lastScan.current) return;
            lastScan.current = text;
            onScanRef.current(text);
          },
          () => {},
        );
      })
      .catch((err) => setError(err?.message || 'Camera unavailable. Allow camera access or type the code instead.'));

    return () => {
      stopped = true;
      if (scanner?.isScanning) scanner.stop().catch(() => {});
    };
  }, [elementId]);

  return (
    <div className="qr-scanner">
      {error && <Alert type="warning" showIcon title={error} style={{ marginBottom: 8 }} />}
      <div id={elementId} />
    </div>
  );
}
