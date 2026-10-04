import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { App, Avatar, Button, Dropdown, Input, Layout, Select } from 'antd';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  LogoutOutlined,
  ShopOutlined,
  TagsOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { logout, selectUser } from '../store/authSlice';
import { selectCity, setCity } from '../store/uiSlice';
import { theatreApi } from '../api';

const { Header, Content, Footer } = Layout;
const YEAR = new Date().getFullYear();

/**
 * Application shell: brand header with search, city picker and account menu,
 * routed page content and a footer.
 */
export default function AppLayout() {
  const user = useSelector(selectUser);
  const city = useSelector(selectCity);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [cities, setCities] = useState([]);

  useEffect(() => {
    theatreApi
      .cities()
      .then((res) => setCities(res.data))
      .catch(() => setCities([]));
  }, []);

  const onLogout = async () => {
    await dispatch(logout());
    message.success('Logged out');
    navigate('/');
  };

  const menuItems = [
    { key: 'bookings', icon: <TagsOutlined />, label: <Link to="/bookings">My bookings</Link> },
    { key: 'profile', icon: <UserOutlined />, label: <Link to="/profile">Profile</Link> },
    user?.role === 'partner' && {
      key: 'partner',
      icon: <ShopOutlined />,
      label: <Link to="/partner">Partner dashboard</Link>,
    },
    user?.role === 'admin' && {
      key: 'admin',
      icon: <DashboardOutlined />,
      label: <Link to="/admin">Admin dashboard</Link>,
    },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Log out', onClick: onLogout },
  ].filter(Boolean);

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Link to="/" className="brand" aria-label="ReelSeat home">
          reel<span>seat</span>
        </Link>

        <Input.Search
          className="header-search"
          placeholder="Search for movies"
          allowClear
          defaultValue={searchParams.get('q') || ''}
          onSearch={(q) => navigate(q ? `/?q=${encodeURIComponent(q)}` : '/')}
        />

        <div className="header-actions">
          <Select
            className="city-select"
            value={city || undefined}
            placeholder={
              <span>
                <EnvironmentOutlined /> All cities
              </span>
            }
            allowClear
            onChange={(value) => dispatch(setCity(value || ''))}
            options={cities.map((c) => ({ value: c, label: c }))}
            variant="borderless"
            popupMatchSelectWidth={false}
          />

          {user ? (
            <Dropdown menu={{ items: menuItems }} placement="bottomRight" trigger={['click']}>
              <Button type="text" className="account-button">
                <Avatar size="small" style={{ background: '#f84464' }}>
                  {user.name?.[0]?.toUpperCase()}
                </Avatar>
                <span className="account-name">Hi, {user.name.split(' ')[0]}</span>
              </Button>
            </Dropdown>
          ) : (
            <Button type="primary" onClick={() => navigate('/login')}>
              Sign in
            </Button>
          )}
        </div>
      </Header>

      <Content className="app-content">
        <Outlet />
      </Content>

      <Footer className="app-footer">
        <div>
          reel<span>seat</span> · Movie ticket booking platform built with MongoDB, Express, React and Node.js
        </div>
        <div className="muted">Demo project — payments run in test mode. © {YEAR}</div>
      </Footer>
    </Layout>
  );
}
