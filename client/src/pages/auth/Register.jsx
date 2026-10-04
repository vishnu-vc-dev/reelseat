import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, App, Button, Form, Input, Radio } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { register } from '../../store/authSlice';
import AuthCard from './AuthCard';

/** Mirrors the server rule so users get instant feedback; the server still enforces it. */
const passwordRules = [
  { required: true, message: 'Choose a password' },
  { min: 8, message: 'At least 8 characters' },
  { pattern: /[A-Za-z]/, message: 'Include a letter' },
  { pattern: /\d/, message: 'Include a number' },
];

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onFinish = async ({ confirm: _confirm, ...values }) => {
    setLoading(true);
    setError('');
    try {
      const user = await dispatch(register(values)).unwrap();
      message.success('Account created');
      navigate(user.role === 'partner' ? '/partner' : '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard title="Create your account" subtitle="It takes less than a minute.">
      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
      <Form layout="vertical" onFinish={onFinish} requiredMark={false} initialValues={{ role: 'user' }}>
        <Form.Item name="name" label="Full name" rules={[{ required: true, min: 2, message: 'Enter your name' }]}>
          <Input prefix={<UserOutlined />} placeholder="Your name" autoComplete="name" />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Enter a valid email' }]}>
          <Input prefix={<MailOutlined />} placeholder="you@example.com" autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={passwordRules} hasFeedback>
          <Input.Password prefix={<LockOutlined />} placeholder="Min 8 chars, a letter and a number" autoComplete="new-password" />
        </Form.Item>
        <Form.Item
          name="confirm"
          label="Confirm password"
          dependencies={['password']}
          hasFeedback
          rules={[
            { required: true, message: 'Confirm your password' },
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                !value || getFieldValue('password') === value
                  ? Promise.resolve()
                  : Promise.reject(new Error('Passwords do not match')),
            }),
          ]}
        >
          <Input.Password prefix={<LockOutlined />} placeholder="Repeat password" autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="role" label="I want to">
          <Radio.Group optionType="button" buttonStyle="solid">
            <Radio value="user">Book tickets</Radio>
            <Radio value="partner">List my theatre</Radio>
          </Radio.Group>
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading}>
          Create account
        </Button>
      </Form>
      <p className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </p>
    </AuthCard>
  );
}
