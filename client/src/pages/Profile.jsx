import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { App, Button, Card, Descriptions, Form, Input, Tag, Typography } from 'antd';
import { authApi } from '../api';
import { selectUser, setUser } from '../store/authSlice';
import { formatDate } from '../utils/format';

const ROLE_LABEL = { user: 'Customer', partner: 'Theatre partner', admin: 'Administrator' };

/** Account details, name change and password change. */
export default function Profile() {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const { message } = App.useApp();
  const [passwordForm] = Form.useForm();
  const [saving, setSaving] = useState('');

  const saveName = async ({ name }) => {
    setSaving('name');
    try {
      const res = await authApi.updateProfile({ name });
      dispatch(setUser(res.data));
      message.success('Profile updated');
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving('');
    }
  };

  const changePassword = async ({ currentPassword, newPassword }) => {
    setSaving('password');
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      passwordForm.resetFields();
      message.success('Password changed');
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="container section narrow profile-page">
      <Typography.Title level={3}>Your account</Typography.Title>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Account type">
            <Tag color="magenta">{ROLE_LABEL[user.role]}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Member since">{formatDate(user.createdAt)}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Profile" style={{ marginBottom: 16 }}>
        <Form layout="inline" initialValues={{ name: user.name }} onFinish={saveName}>
          <Form.Item name="name" rules={[{ required: true, min: 2, message: 'Enter your name' }]} style={{ flex: 1 }}>
            <Input placeholder="Full name" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving === 'name'}>
            Save
          </Button>
        </Form>
      </Card>

      <Card title="Change password">
        <Form form={passwordForm} layout="vertical" onFinish={changePassword} requiredMark={false} style={{ maxWidth: 400 }}>
          <Form.Item name="currentPassword" label="Current password" rules={[{ required: true }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="New password"
            rules={[
              { required: true, message: 'Choose a password' },
              { min: 8, message: 'At least 8 characters' },
              { pattern: /[A-Za-z]/, message: 'Include a letter' },
              { pattern: /\d/, message: 'Include a number' },
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving === 'password'}>
            Update password
          </Button>
        </Form>
      </Card>
    </div>
  );
}
