import { useState } from 'react';
import {
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { movieApi } from '../../api';
import useAsync from '../../hooks/useAsync';
import Poster from '../../components/Poster';
import { dayjs, formatDate, formatDuration } from '../../utils/format';

const GENRES = ['Action', 'Adventure', 'Animation', 'Biopic', 'Comedy', 'Drama', 'Family', 'Horror', 'Mystery', 'Period', 'Romance', 'Sci-Fi', 'Spy', 'Thriller'];
const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];

/** Mirrors the server rule: absolute http(s) URL or a site-relative path such as /posters/x.svg. */
const POSTER_PATTERN = /^(https?:\/\/\S+|\/(?!\/)[\w./-]+)$/i;

const toOptions =(list) => list.map((v) => ({ value: v, label: v }));

/** Admin catalogue management: add, edit, (de)activate and delete movies. */
export default function MoviesTab() {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const movies = useAsync(
    () => movieApi.list({ includeInactive: true, search: search || undefined, limit: 50 }).then((r) => r.data),
    [search],
  );
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const open = (movie) => {
    setEditing(movie || {});
    form.resetFields();
    form.setFieldsValue(
      movie
        ? { ...movie, releaseDate: dayjs(movie.releaseDate) }
        : { certificate: 'UA', genres: [], languages: [], cast: [], releaseDate: dayjs() },
    );
  };

  const save = async () => {
    const values = await form.validateFields();
    const body = { ...values, releaseDate: values.releaseDate.format('YYYY-MM-DD') };
    setSaving(true);
    try {
      if (editing._id) await movieApi.update(editing._id, body);
      else await movieApi.create(body);
      message.success(editing._id ? 'Movie updated' : 'Movie added');
      setEditing(null);
      movies.reload();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (movie, isActive) => {
    try {
      await movieApi.update(movie._id, { isActive });
      movies.reload();
    } catch (err) {
      message.error(err.message);
    }
  };

  const remove = async (movie) => {
    try {
      await movieApi.remove(movie._id);
      message.success('Movie deleted');
      movies.reload();
    } catch (err) {
      message.error(err.message);
    }
  };

  return (
    <>
      <div className="tab-toolbar">
        <Input.Search placeholder="Search titles" allowClear onSearch={setSearch} style={{ maxWidth: 280 }} />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open(null)}>
          Add movie
        </Button>
      </div>

      <Table
        rowKey="_id"
        loading={movies.loading}
        dataSource={movies.data || []}
        scroll={{ x: 900 }}
        columns={[
          {
            title: 'Movie',
            render: (_, m) => (
              <Space>
                <Poster src={m.posterUrl} title={m.title} className="table-thumb" />
                <span>
                  <strong>{m.title}</strong>
                  <div className="muted">{m.genres.join(', ')}</div>
                </span>
              </Space>
            ),
          },
          { title: 'Languages', dataIndex: 'languages', render: (l) => l.join(', ') },
          { title: 'Runtime', dataIndex: 'durationMinutes', render: formatDuration, width: 100 },
          { title: 'Release', dataIndex: 'releaseDate', render: formatDate, width: 150 },
          { title: 'Cert', dataIndex: 'certificate', render: (c) => <Tag>{c}</Tag>, width: 70 },
          {
            title: 'Active',
            dataIndex: 'isActive',
            width: 80,
            render: (active, m) => <Switch size="small" checked={active} onChange={(v) => toggleActive(m, v)} />,
          },
          {
            title: '',
            width: 100,
            render: (_, m) => (
              <Space>
                <Button size="small" icon={<EditOutlined />} onClick={() => open(m)} aria-label="Edit movie" />
                <Popconfirm title="Delete permanently? Movies with shows can only be deactivated." onConfirm={() => remove(m)}>
                  <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete movie" />
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />

      <Modal
        title={editing?._id ? `Edit ${editing.title}` : 'Add movie'}
        open={Boolean(editing)}
        onCancel={() => setEditing(null)}
        onOk={save}
        confirmLoading={saving}
        width={720}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" requiredMark={false}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Synopsis" rules={[{ required: true, min: 10 }]}>
            <Input.TextArea rows={3} showCount maxLength={2000} />
          </Form.Item>
          <Space wrap align="start">
            <Form.Item name="durationMinutes" label="Runtime (minutes)" rules={[{ required: true }]}>
              <InputNumber min={1} max={600} />
            </Form.Item>
            <Form.Item name="releaseDate" label="Release date" rules={[{ required: true }]}>
              <DatePicker format="DD MMM YYYY" />
            </Form.Item>
            <Form.Item name="certificate" label="Certificate">
              <Select style={{ width: 90 }} options={toOptions(['U', 'UA', 'A'])} />
            </Form.Item>
          </Space>
          <Form.Item name="genres" label="Genres" rules={[{ required: true, type: 'array', min: 1 }]}>
            <Select mode="tags" options={toOptions(GENRES)} />
          </Form.Item>
          <Form.Item name="languages" label="Languages" rules={[{ required: true, type: 'array', min: 1 }]}>
            <Select mode="tags" options={toOptions(LANGUAGES)} />
          </Form.Item>
          <Form.Item
            name="posterUrl"
            label="Poster URL"
            rules={[{ required: true, pattern: POSTER_PATTERN, message: 'Enter an http(s) URL or a /path' }]}
          >
            <Input placeholder="https://…" />
          </Form.Item>
          <Form.Item name="trailerUrl" label="Trailer URL" rules={[{ type: 'url' }]}>
            <Input placeholder="https://youtube.com/…" />
          </Form.Item>
          <Space wrap style={{ display: 'flex' }} align="start">
            <Form.Item name="director" label="Director">
              <Input />
            </Form.Item>
            <Form.Item name="cast" label="Cast" style={{ minWidth: 320 }}>
              <Select mode="tags" open={false} tokenSeparators={[',']} placeholder="Type names, press Enter" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
