import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Form, Input, Steps } from 'antd';
import { LockOutlined, MailOutlined, NumberOutlined } from '@ant-design/icons';
import { authApi } from '../../api';
import AuthCard from './AuthCard';

/**
 * Two-step password reset: request a 6-digit code by email, then submit the
 * code with a new password. The first step never reveals whether the email
 * is registered.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const requestCode = async (values) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.forgotPassword(values.email);
      setEmail(values.email);
      message.info(res.message);
      setStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async ({ otp, password }) => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.resetPassword({ email, otp, password });
      message.success(res.message);
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Reset your password">
      <Steps size="small" current={step} items={[{ title: 'Email' }, { title: 'New password' }]} style={{ marginBottom: 24 }} />
      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      {step === 0 ? (
        <Form layout="vertical" onFinish={requestCode} requiredMark={false}>
          <Form.Item name="email" label="Account email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
            <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Send reset code
          </Button>
        </Form>
      ) : (
        <Form layout="vertical" onFinish={reset} requiredMark={false}>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title={`If ${email} is registered, a 6-digit code is on its way. It expires in 10 minutes.`}
          />
          <Form.Item name="otp" label="Reset code" rules={[{ required: true, pattern: /^\d{6}$/, message: 'Enter the 6 digit code' }]}>
            <Input prefix={<NumberOutlined />} placeholder="123456" inputMode="numeric" maxLength={6} autoComplete="one-time-code" />
          </Form.Item>
          <Form.Item
            name="password"
            label="New password"
            rules={[
              { required: true, message: 'Choose a password' },
              { min: 8, message: 'At least 8 characters' },
              { pattern: /[A-Za-z]/, message: 'Include a letter' },
              { pattern: /\d/, message: 'Include a number' },
            ]}
          >
            <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={loading}>
            Update password
          </Button>
          <Button type="link" block onClick={() => setStep(0)}>
            Use a different email
          </Button>
        </Form>
      )}

      <p className="auth-footer">
        Remembered it? <Link to="/login">Back to sign in</Link>
      </p>
    </AuthCard>
  );
}
