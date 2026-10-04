import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { login } from '../../store/authSlice';
import AuthCard from './AuthCard';

/** Where each role lands after logging in, unless they were redirected here from a protected page. */
const HOME_BY_ROLE = { admin: '/admin', partner: '/partner', user: '/' };

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    setError('');
    try {
      const user = await dispatch(login(values)).unwrap();
      message.success(`Welcome back, ${user.name.split(' ')[0]}!`);
      navigate(location.state?.from || HOME_BY_ROLE[user.role] || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Sign in" subtitle="Book tickets, manage your theatres or run the platform.">
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={onFinish} requiredMark={false} autoComplete="on">
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
          <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Enter your password' }]}>
          <Input.Password prefix={<LockOutlined />} placeholder="Password" autoComplete="current-password" />
        </Form.Item>
        <div className="auth-row">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Sign in
        </Button>
      </Form>
      <p className="auth-footer">
        New here? <Link to="/register">Create an account</Link>
      </p>
    </AuthCard>
  );
}
