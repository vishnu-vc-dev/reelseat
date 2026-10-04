import { useState } from 'react';
import { useSelector } from 'react-redux';
import { App, Input, Select, Switch, Table, Tag } from 'antd';
import { adminApi } from '../../api';
import useAsync from '../../hooks/useAsync';
import { selectUser } from '../../store/authSlice';
import { formatDate } from '../../utils/format';

const ROLE_COLOR = { admin: 'purple', partner: 'blue', user: 'default' };

/** User directory with role filter and account activation. */
export default function UsersTab() {
  const me = useSelector(selectUser);
  const { message } = App.useApp();
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const users = useAsync(
    () => adminApi.users({ role: role || undefined, search: search || undefined }).then((r) => r.data),
    [role, search],
  );

  const toggle = async (user, isActive) => {
    try {
      await adminApi.setUserActive(user._id, isActive);
      message.success(`${user.name} ${isActive ? 'activated' : 'deactivated'}`);
      users.reload();
    } catch (err) {
      message.error(err.message);
    }
  };

  return (
    <>
      <div className="tab-toolbar">
        <Input.Search placeholder="Search name or email" allowClear onSearch={setSearch} style={{ maxWidth: 280 }} />
        <Select
          allowClear
          placeholder="All roles"
          style={{ width: 140 }}
          value={role || undefined}
          onChange={(v) => setRole(v || '')}
          options={[
            { value: 'user', label: 'Customers' },
            { value: 'partner', label: 'Partners' },
            { value: 'admin', label: 'Admins' },
          ]}
        />
      </div>
      <Table
        rowKey="_id"
        loading={users.loading}
        dataSource={users.data || []}
        scroll={{ x: 700 }}
        columns={[
          { title: 'Name', dataIndex: 'name' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'Role', dataIndex: 'role', render: (r) => <Tag color={ROLE_COLOR[r]}>{r}</Tag>, width: 100 },
          { title: 'Joined', dataIndex: 'createdAt', render: formatDate, width: 150 },
          {
            title: 'Active',
            dataIndex: 'isActive',
            width: 90,
            render: (active, u) => (
              <Switch size="small" checked={active} disabled={u._id === me._id} onChange={(v) => toggle(u, v)} />
            ),
          },
        ]}
      />
    </>
  );
}
