import { useState } from 'react';
import { App, Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { theatreApi } from '../../api';
import useAsync from '../../hooks/useAsync';

const STATUS_COLOR = { approved: 'green', pending: 'gold', blocked: 'red' };

/** Partner's theatres: create, edit, delete and see approval status. */
export default function TheatresTab() {
  const { message } = App.useApp();
  const theatres = useAsync(() => theatreApi.mine().then((r) => r.data), []);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const open = (theatre) => {
    setEditing(theatre || {});
    form.setFieldsValue(theatre || { screens: 1 });
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing._id) {
        await theatreApi.update(editing._id, values);
        message.success('Theatre updated');
      } else {
        await theatreApi.create(values);
        message.success('Theatre submitted. An admin will review it shortly.');
      }
      setEditing(null);
      theatres.reload();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (theatre) => {
    try {
      await theatreApi.remove(theatre._id);
      message.success('Theatre deleted');
      theatres.reload();
    } catch (err) {
      message.error(err.message);
    }
  };

  return (
    <>
      <div className="tab-toolbar">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>
          Add theatre
        </Button>
      </div>
      <Table
        rowKey="_id"
        loading={theatres.loading}
        dataSource={theatres.data || []}
        scroll={{ x: 700 }}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'City', dataIndex: 'city' },
          { title: 'Address', dataIndex: 'address', ellipsis: true },
          { title: 'Screens', dataIndex: 'screens', width: 90 },
          {
            title: 'Status',
            dataIndex: 'status',
            render: (status, t) => (
              <Tooltip title={t.statusReason}>
                <Tag color={STATUS_COLOR[status]}>{status.toUpperCase()}</Tag>
              </Tooltip>
            ),
          },
          {
            title: '',
            width: 100,
            render: (_, t) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => open(t)} aria-label="Edit theatre" />
                <Popconfirm title="Delete this theatre?" onConfirm={() => remove(t)}>
                  <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete theatre" />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing?._id ? 'Edit theatre' : 'Add theatre'}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={save}
        confirmLoading={saving}
        okText={editing?._id ? 'Save' : 'Submit for approval'}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="name" label="Theatre name" rules={[{ required: true, min: 2 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Address" rules={[{ required: true, min: 5 }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="city" label="City" rules={[{ required: true, min: 2 }]}>
              <Input />
            </Form.Item>
            <Form.Item name="screens" label="Screens" rules={[{ required: true }]}>
              <InputNumber min={1} max={20} />
            </Form.Item>
          </Space>
          <Form.Item name="phone" label="Phone" rules={[{ required: true, pattern: /^[+\d][\d\s-]{7,15}$/, message: 'Enter a valid phone' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Contact email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
