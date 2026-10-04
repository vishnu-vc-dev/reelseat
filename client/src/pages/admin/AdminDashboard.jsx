import { useSearchParams } from 'react-router-dom';
import { Tabs, Typography } from 'antd';
import { BarChartOutlined, ShopOutlined, TeamOutlined, VideoCameraOutlined } from '@ant-design/icons';
import AdminOverview from './AdminOverview';
import MoviesTab from './MoviesTab';
import TheatresReviewTab from './TheatresReviewTab';
import UsersTab from './UsersTab';

/** Administrator workspace; the active tab is kept in the URL. */
export default function AdminDashboard() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';

  return (
    <div className="container section">
      <Typography.Title level={3}>Admin dashboard</Typography.Title>
      <Tabs
        activeKey={tab}
        onChange={(key) => setParams({ tab: key })}
        destroyOnHidden
        items={[
          { key: 'overview', label: 'Overview', icon: <BarChartOutlined />, children: <AdminOverview /> },
          { key: 'movies', label: 'Movies', icon: <VideoCameraOutlined />, children: <MoviesTab /> },
          { key: 'theatres', label: 'Theatres', icon: <ShopOutlined />, children: <TheatresReviewTab /> },
          { key: 'users', label: 'Users', icon: <TeamOutlined />, children: <UsersTab /> },
        ]}
      />
    </div>
  );
}
