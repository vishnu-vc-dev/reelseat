import { useState } from 'react';
import { App, Button, Input, Modal, Segmented, Space, Table, Tag, Tooltip } from 'antd';
import { CheckOutlined, StopOutlined } from '@ant-design/icons';
import { adminApi } from '../../api';
import useAsync from '../../hooks/useAsync';
import { formatDate } from '../../utils/format';

const STATUS_COLOR = { approved: 'green', pending: 'gold', blocked: 'red' };

/** Admin review queue for partner theatres: approve, block (with a reason) or unblock. */
export default function TheatresReviewTab() {
  const { message } = App.useApp();
  const [status, setStatus] = useState('pending');
  const theatres = useAsync(
    () => adminApi.theatres(status === 'all' ? {} : { status }).then((r) => r.data),
    [status],
  );
  const [blocking, setBlocking] = useState(null);
  const [reason, setReason] = useState('');

  const update = async (theatre, next, why) => {
    try {
      await adminApi.setTheatreStatus(theatre._id, { status: next, reason: why });
      message.success(`${theatre.name} ${next}`);
      theatres.reload();
    } catch (err) {
      message.error(err.message);
    }
  };

  return (
    <>
      <div className="tab-toolbar">
        <Segmented
          value={status}
          onChange={setStatus}
          options={[
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Blocked', value: 'blocked' },
            { label: 'All', value: 'all' },
          ]}
        />
      </div>
      <Table
        rowKey="_id"
        loading={theatres.loading}
        dataSource={theatres.data || []}
        scroll={{ x: 900 }}
        columns={[
          {
            title: 'Theatre',
            render: (_, t) => (
              <span>
                <strong>{t.name}</strong>
                <div className="muted">
                  {t.address}, {t.city}
                </div>
              </span>
            ),
          },
          {
            title: 'Partner',
            render: (_, t) => (
              <span>
                {t.owner?.name}
                <div className="muted">{t.owner?.email}</div>
              </span>
            ),
          },
          { title: 'Screens', dataIndex: 'screens', width: 80 },
          { title: 'Applied', dataIndex: 'createdAt', render: formatDate, width: 140 },
          {
            title: 'Status',
            dataIndex: 'status',
            width: 110,
            render: (s, t) => (
              <Tooltip title={t.statusReason}>
                <Tag color={STATUS_COLOR[s]}>{s.toUpperCase()}</Tag>
              </Tooltip>
            ),
          },
          {
            title: '',
            width: 200,
            render: (_, t) => (
              <Space>
                {t.status !== 'approved' && (
                  <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => update(t, 'approved')}>
                    Approve
                  </Button>
                )}
                {t.status !== 'blocked' && (
                  <Button
                    size="small"
                    danger
                    icon={<StopOutlined />}
                    onClick={() => {
                      setBlocking(t);
                      setReason('');
                    }}
                  >
                    Block
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={`Block ${blocking?.name}`}
        open={Boolean(blocking)}
        okText="Block theatre"
        okButtonProps={{ danger: true, disabled: !reason.trim() }}
        onCancel={() => setBlocking(null)}
        onOk={async () => {
          await update(blocking, 'blocked', reason.trim());
          setBlocking(null);
        }}
      >
        <p>Blocked theatres disappear from customer search. The partner sees this reason:</p>
        <Input.TextArea rows={3} maxLength={300} showCount value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>
    </>
  );
}
