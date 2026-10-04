import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { Alert, Button, Card, Empty, Result, Select, Skeleton, Tag, Tooltip, Typography } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { movieApi, showApi } from '../api';
import useAsync from '../hooks/useAsync';
import Poster from '../components/Poster';
import { selectCity } from '../store/uiSlice';
import { dayjs, formatDate, formatDuration, formatINR, formatTime, ist, istDateString } from '../utils/format';

const DAYS_AHEAD = 7;

/**
 * Colour-codes a showtime by remaining seats, like BookMyShow:
 * green = plenty, amber = filling fast, red = almost full.
 */
function availabilityClass(show) {
  const ratio = show.availableSeats / show.totalSeats;
  if (show.availableSeats === 0) return 'showtime sold-out';
  if (ratio < 0.15) return 'showtime almost-full';
  if (ratio < 0.5) return 'showtime filling';
  return 'showtime available';
}

export default function MovieDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const city = useSelector(selectCity);
  const [date, setDate] = useState(istDateString(0));
  const [language, setLanguage] = useState('');

  const movie = useAsync(() => movieApi.get(id).then((r) => r.data), [id]);
  const shows = useAsync(
    () => showApi.forMovie(id, { date, city: city || undefined }).then((r) => r.data),
    [id, date, city],
  );

  if (movie.error) {
    return <Result status="404" title="Movie not found" extra={<Button onClick={() => navigate('/')}>Back</Button>} />;
  }
  if (!movie.data) return <Skeleton active className="container section" />;

  const m = movie.data;
  const upcoming = dayjs(m.releaseDate).isAfter(dayjs());
  const theatres = (shows.data?.theatres || [])
    .map((t) => ({
      ...t,
      shows: language ? t.shows.filter((s) => s.language === language) : t.shows,
    }))
    .filter((t) => t.shows.length);

  return (
    <>
      <section className="movie-hero" style={{ '--hero-image': `url(${m.posterUrl})` }}>
        <div className="container movie-hero-inner">
          <Poster src={m.posterUrl} title={m.title} className="movie-hero-poster" />
          <div className="movie-hero-info">
            <Typography.Title level={1} className="movie-hero-title">
              {m.title}
            </Typography.Title>
            <div className="movie-hero-tags">
              {m.languages.map((l) => (
                <Tag key={l}>{l}</Tag>
              ))}
            </div>
            <div className="movie-hero-meta">
              <ClockCircleOutlined /> {formatDuration(m.durationMinutes)} · {m.genres.join(', ')} · {m.certificate} ·{' '}
              {upcoming ? `Releases ${formatDate(m.releaseDate)}` : `Released ${formatDate(m.releaseDate)}`}
            </div>
            {m.trailerUrl && (
              <Button ghost icon={<PlayCircleOutlined />} href={m.trailerUrl} target="_blank" rel="noreferrer">
                Watch trailer
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="container section movie-body">
        <div className="movie-about">
          <Typography.Title level={4}>About the movie</Typography.Title>
          <Typography.Paragraph>{m.description}</Typography.Paragraph>
          {m.director && (
            <Typography.Paragraph>
              <strong>Director:</strong> {m.director}
            </Typography.Paragraph>
          )}
          {m.cast?.length > 0 && (
            <Typography.Paragraph>
              <strong>Cast:</strong> {m.cast.join(', ')}
            </Typography.Paragraph>
          )}
        </div>

        <Card className="showtimes-card" title="Book tickets">
          {upcoming ? (
            <Empty description={`Bookings open closer to release on ${formatDate(m.releaseDate)}`} />
          ) : (
            <>
              <div className="date-strip" role="tablist" aria-label="Choose a date">
                {Array.from({ length: DAYS_AHEAD }, (_, i) => {
                  const value = istDateString(i);
                  const d = ist(dayjs(value));
                  return (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={value === date}
                      key={value}
                      className={`date-chip ${value === date ? 'active' : ''}`}
                      onClick={() => setDate(value)}
                    >
                      <span className="date-chip-dow">{i === 0 ? 'TODAY' : d.format('ddd').toUpperCase()}</span>
                      <span className="date-chip-day">{d.format('DD')}</span>
                      <span className="date-chip-month">{d.format('MMM').toUpperCase()}</span>
                    </button>
                  );
                })}
              </div>

              <div className="showtimes-filters">
                <span className="muted">
                  <EnvironmentOutlined /> {city || 'All cities'}
                </span>
                <Select
                  allowClear
                  placeholder="Any language"
                  size="small"
                  style={{ minWidth: 140 }}
                  value={language || undefined}
                  onChange={(v) => setLanguage(v || '')}
                  options={m.languages.map((l) => ({ label: l, value: l }))}
                />
                <span className="legend">
                  <i className="dot available" /> Available <i className="dot filling" /> Filling fast{' '}
                  <i className="dot almost-full" /> Almost full
                </span>
              </div>

              {shows.error && <Alert type="error" showIcon message={shows.error.message} />}
              {shows.loading && !shows.data ? (
                <Skeleton active />
              ) : theatres.length ? (
                theatres.map(({ theatre, shows: list }) => (
                  <div className="theatre-row" key={theatre._id}>
                    <div className="theatre-name">
                      <strong>{theatre.name}</strong>
                      <span className="muted">
                        {theatre.address}, {theatre.city}
                      </span>
                    </div>
                    <div className="theatre-shows">
                      {list.map((s) => (
                        <Tooltip
                          key={s._id}
                          title={`${s.language} · ${s.format} · Screen ${s.screen} · from ${formatINR(s.minPrice)} · ${s.availableSeats}/${s.totalSeats} seats left`}
                        >
                          <button
                            type="button"
                            className={availabilityClass(s)}
                            disabled={s.availableSeats === 0}
                            onClick={() => navigate(`/shows/${s._id}`)}
                          >
                            {formatTime(s.startTime)}
                            <small>
                              {s.format !== '2D' ? s.format : s.language}
                            </small>
                          </button>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <Empty description={`No shows ${city ? `in ${city} ` : ''}on ${formatDate(date)}. Try another date or city.`} />
              )}
            </>
          )}
        </Card>
      </div>
    </>
  );
}
