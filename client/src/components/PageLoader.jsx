import { Spin } from 'antd';

/** Full-width centred spinner used while a page loads its data. */
export default function PageLoader({ tip = 'Loading…' }) {
  return (
    <div className="page-loader">
      <Spin size="large" description={tip}>
        <div style={{ padding: 40 }} />
      </Spin>
    </div>
  );
}
