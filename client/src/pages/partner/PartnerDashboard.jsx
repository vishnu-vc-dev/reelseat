import { useSearchParams } from 'react-router-dom';
import { Tabs, Typography } from 'antd';
import { BarChartOutlined, CalendarOutlined, QrcodeOutlined, ShopOutlined } from '@ant-design/icons';
import PartnerOverview from './PartnerOverview';
import TheatresTab from './TheatresTab';
import ShowsTab from './ShowsTab';
import CheckInTab from './CheckInTab';

/** Partner workspace. The active tab lives in the URL so it survives refreshes and can be linked. */
export default function PartnerDashboard() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

  return (
    <div className="container section">
      <Typography.Title level={3}>Partner dashboard</Typography.Title>
      <Tabs
        activeKey={tab}
        onChange={(key) => setParams({ tab: key })}
        destroyOnHidden
        items={[
          { key: 'overview', label: 'Overview', icon: <BarChartOutlined />, children: <PartnerOverview /> },
          { key: 'theatres', label: 'Theatres', icon: <ShopOutlined />, children: <TheatresTab /> },
          { key: 'shows', label: 'Shows', icon: <CalendarOutlined />, children: <ShowsTab /> },
          { key: 'checkin', label: 'Check-in', icon: <QrcodeOutlined />, children: <CheckInTab /> },
        ]}
      />
    </div>
  );
}
