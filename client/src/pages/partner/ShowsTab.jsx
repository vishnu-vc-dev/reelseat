import { useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Drawer,
  Form,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { DeleteOutlined, DollarOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons';
import { movieApi, partnerApi, showApi, theatreApi } from '../../api';
import useAsync from '../../hooks/useAsync';
import SeatLayoutEditor from './SeatLayoutEditor';
import { DEFAULT_LAYOUT } from '../../utils/seatLayout';
import { dayjs, formatDateTime, formatINR, TZ } from '../../utils/format';

const FORMATS = ['2D', '3D', 'IMAX', '4DX'];

/**
 * Show scheduling for a partner: list with occupancy, schedule new shows,
 * re-price, delete unsold shows and view the bookings of a show.
 */
export default function ShowsTab() {
  const { message } = App.useApp();
  const [upcomingOnly, setUpcomingOnly] = useState(true);
  const shows = useAsync(() => showApi.mine({ upcoming: upcomingOnly || undefined }).then((r) => r.data), [upcomingOnly]);
  const theatres = useAsync(() => theatreApi.mine().then((r) => r.data), []);
  const movies = useAsync(() => movieApi.list({ limit: 50 }).then((r) => r.data), []);

  const [mode, setMode] = useState(null);
  const [current, setCurrent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bookingsFor, setBookingsFor] = useState(null);
  const [form] = Form.useForm();

  const approvedTheatres = (theatres.data || []).filter((t) => t.status === 'approved');
  const selectedTheatreId = Form.useWatch('theatre', form);
  const selectedMovieId = Form.useWatch('movie', form);
  const selectedTheatre = approvedTheatres.find((t) => t._id === selectedTheatreId);
  const selectedMovie = (movies.data || []).find((m) => m._id === selectedMovieId);

  const bookings = useAsync(
    () => (bookingsFor ? partnerApi.bookings({ show: bookingsFor._id }).then((r) => r.data) : Promise.resolve([])),
    [bookingsFor],
  );

  const openCreate = () => {
    setMode('create');
    form.resetFields();
    form.setFieldsValue({ screen: 1, format: '2D', seatLayout: structuredClone(DEFAULT_LAYOUT) });
  };

  const openReprice = (show) => {
    setMode('price');
    setCurrent(show);
    form.resetFields();
    form.setFieldsValue({ seatLayout: structuredClone(show.seatLayout) });
  };

  const save = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (mode === 'create') {
        /** The picker shows wall-clock time; interpret it as IST regardless of the browser's timezone. */
        const startTime = dayjs.tz(values.startTime.format('YYYY-MM-DDTHH:mm'), TZ).toISOString();
        await showApi.create({ ...values, startTime });
        message.success('Show scheduled');
      } else {
        await showApi.update(current._id, { seatLayout: values.seatLayout });
        message.success('Prices updated');
      }
      setMode(null);
      shows.reload();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (show) => {
    try {
      await showApi.remove(show._id);
      message.success('Show deleted');
      shows.reload();
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    {
      title: 'Movie',
      dataIndex: ['movie', 'title'],
      render: (title, s) => (
        <span>
          {title} <Tag>{s.format}</Tag>
        </span>
      ),
    },
    { title: 'Theatre', render: (_, s) => `${s.theatre?.name} · Screen ${s.screen}` },
    { title: 'Starts', dataIndex: 'startTime', render: formatDateTime, sorter: (a, b) => new Date(a.startTime) - new Date(b.startTime) },
    { title: 'Language', dataIndex: 'language' },
    {
      title: 'Sold',
      width: 180,
      render: (_, s) => (
        <Progress
          size="small"
          percent={Math.round((s.bookedSeats.length / s.totalSeats) * 100)}
          format={() => `${s.bookedSeats.length}/${s.totalSeats}`}
          strokeColor="#f84464"
        />
      ),
    },
    {
      title: '',
      width: 130,
      render: (_, s) => (
        <Space>
          <Button size="small" icon={<TeamOutlined />} onClick={() => setBookingsFor(s)} aria-label="View bookings" />
          <Button size="small" icon={<DollarOutlined />} onClick={() => openReprice(s)} aria-label="Edit prices" />
          <Popconfirm
            title={s.bookedSeats.length ? 'Shows with sold tickets cannot be deleted' : 'Delete this show?'}
            onConfirm={() => remove(s)}
            okButtonProps={{ disabled: s.bookedSeats.length > 0 }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete show" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="tab-toolbar">
        <Space>
          <Switch checked={upcomingOnly} onChange={setUpcomingOnly} /> Upcoming only
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} disabled={!approvedTheatres.length}>
          Schedule show
        </Button>
      </div>

      <Table rowKey="_id" loading={shows.loading} dataSource={shows.data || []} columns={columns} scroll={{ x: 900 }} />

      <Modal
        title={mode === 'create' ? 'Schedule a show' : 'Edit seat prices'}
        open={Boolean(mode)}
        onCancel={() => setMode(null)}
        onOk={save}
        confirmLoading={saving}
        width={680}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          {mode === 'create' && (
            <>
              <Form.Item name="theatre" label="Theatre" rules={[{ required: true }]}>
                <Select
                  placeholder="Choose an approved theatre"
                  options={approvedTheatres.map((t) => ({ value: t._id, label: `${t.name}, ${t.city}` }))}
                />
              </Form.Item>
              <Form.Item name="movie" label="Movie" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  placeholder="Choose a movie"
                  options={(movies.data || []).map((m) => ({ value: m._id, label: m.title }))}
                  onChange={() => form.setFieldValue('language', undefined)}
                />
              </Form.Item>
              <Space wrap align="start">
                <Form.Item name="screen" label="Screen" rules={[{ required: true }]}>
                  <InputNumber min={1} max={selectedTheatre?.screens || 20} />
                </Form.Item>
                <Form.Item name="language" label="Language" rules={[{ required: true }]}>
                  <Select
                    style={{ width: 140 }}
                    placeholder="Language"
                    options={(selectedMovie?.languages || []).map((l) => ({ value: l, label: l }))}
                  />
                </Form.Item>
                <Form.Item name="format" label="Format">
                  <Select style={{ width: 100 }} options={FORMATS.map((f) => ({ value: f, label: f }))} />
                </Form.Item>
                <Form.Item name="startTime" label="Start time (IST)" rules={[{ required: true }]}>
                  <DatePicker
                    showTime={{ format: 'HH:mm', minuteStep: 5 }}
                    format="DD MMM YYYY, HH:mm"
                    disabledDate={(d) => d && d.isBefore(dayjs().startOf('day'))}
                  />
                </Form.Item>
              </Space>
            </>
          )}
          <SeatLayoutEditor pricesOnly={mode === 'price' && current?.bookedSeats.length > 0} />
        </Form>
      </Modal>

      <Drawer
        title={bookingsFor ? `Bookings · ${bookingsFor.movie?.title}, ${formatDateTime(bookingsFor.startTime)}` : ''}
        open={Boolean(bookingsFor)}
        onClose={() => setBookingsFor(null)}
        size="large"
      >
        <List
          loading={bookings.loading}
          dataSource={bookings.data || []}
          locale={{ emptyText: 'No bookings yet' }}
          renderItem={(b) => (
            <List.Item extra={b.checkedInAt ? <Tag color="purple">Admitted</Tag> : <Tag>Not arrived</Tag>}>
              <List.Item.Meta
                title={`${b.user?.name} · ${b.seats.join(', ')}`}
                description={`${b.ticketCode} · ${formatINR(b.totalAmount)} · ${b.user?.email}`}
              />
            </List.Item>
          )}
        />
      </Drawer>
    </>
  );
}
