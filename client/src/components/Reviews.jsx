import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Alert, App, Avatar, Button, Card, Empty, Form, Input, Pagination, Popconfirm, Progress, Rate, Typography } from 'antd';
import { movieApi } from '../api';
import useAsync from '../hooks/useAsync';
import { selectUser } from '../store/authSlice';
import { formatDate } from '../utils/format';

const PAGE_SIZE = 5;

/**
 * Reviews block for the movie page: rating summary with a star histogram,
 * the caller's own review form (when eligible) and a paginated list.
 * @param {{ movieId: string, onSummaryChange?: () => void }} props
 */
export default function Reviews({ movieId, onSummaryChange }) {
  const user = useSelector(selectUser);
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const reviews = useAsync(
    () => movieApi.reviews(movieId, { page, limit: PAGE_SIZE }).then((r) => r.data),
    [movieId, page, user?._id],
  );

  const data = reviews.data;
  const total = data?.total || 0;
  const average = total
    ? Object.entries(data.histogram).reduce((sum, [stars, n]) => sum + Number(stars) * n, 0) / total
    : 0;

  const save = async (values) => {
    setSaving(true);
    try {
      const res = await movieApi.saveReview(movieId, values);
      message.success(res.message);
      setEditing(false);
      reviews.reload();
      onSummaryChange?.();
    } catch (err) {
      message.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await movieApi.deleteReview(movieId);
      message.success('Review deleted');
      reviews.reload();
      onSummaryChange?.();
    } catch (err) {
      message.error(err.message);
    }
  };

  const showForm = data?.canReview && (!data.mine || editing);

  return (
    <Card title="Ratings & reviews" className="reviews-card">
      <div className="reviews-summary">
        <div className="reviews-score">
          <div className="reviews-average">{total ? average.toFixed(1) : '–'}</div>
          <Rate disabled allowHalf value={Math.round(average * 2) / 2} />
          <div className="muted">
            {total} review{total === 1 ? '' : 's'}
          </div>
        </div>
        <div className="reviews-histogram">
          {[5, 4, 3, 2, 1].map((stars) => (
            <div key={stars} className="reviews-histogram-row">
              <span>{stars}★</span>
              <Progress
                percent={total ? Math.round((data.histogram[stars] / total) * 100) : 0}
                showInfo={false}
                size="small"
                strokeColor="#f84464"
              />
              <span className="muted">{data?.histogram[stars] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {!user && (
        <Typography.Paragraph type="secondary">
          <Link to="/login">Sign in</Link> to rate movies you have watched.
        </Typography.Paragraph>
      )}
      {user && data && !data.canReview && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }} title="Reviews open after you watch this movie with a ticket booked here." />
      )}

      {data?.mine && !editing && (
        <div className="review own-review">
          <div className="review-head">
            <strong>Your review</strong>
            <Rate disabled value={data.mine.rating} />
          </div>
          {data.mine.comment && <p>{data.mine.comment}</p>}
          <Button size="small" onClick={() => setEditing(true)}>
            Edit
          </Button>{' '}
          <Popconfirm title="Delete your review?" onConfirm={remove}>
            <Button size="small" danger type="text">
              Delete
            </Button>
          </Popconfirm>
        </div>
      )}

      {showForm && (
        <Form
          layout="vertical"
          onFinish={save}
          initialValues={{ rating: data.mine?.rating, comment: data.mine?.comment }}
          className="review-form"
          requiredMark={false}
        >
          <Form.Item name="rating" label="Your rating" rules={[{ required: true, message: 'Pick a rating' }]}>
            <Rate />
          </Form.Item>
          <Form.Item name="comment" label="Your thoughts (optional)">
            <Input.TextArea rows={3} maxLength={500} showCount placeholder="What did you like or dislike?" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={saving}>
            {data.mine ? 'Update review' : 'Post review'}
          </Button>
          {editing && (
            <Button type="link" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </Form>
      )}

      {total === 0 ? (
        <Empty description="No reviews yet" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          {data.items.map((r) => (
            <div key={r._id} className="review">
              <div className="review-head">
                <Avatar size="small" style={{ background: '#1f2533' }}>
                  {r.user?.name?.[0]?.toUpperCase()}
                </Avatar>
                <strong>{r.user?.name}</strong>
                <Rate disabled value={r.rating} className="review-stars" />
                <span className="muted">{formatDate(r.createdAt)}</span>
              </div>
              {r.comment && <p>{r.comment}</p>}
            </div>
          ))}
          {total > PAGE_SIZE && (
            <Pagination size="small" current={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
          )}
        </>
      )}
    </Card>
  );
}
