import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Empty, Segmented, Select, Skeleton, Tag, Typography } from 'antd';
import { movieApi } from '../api';
import useAsync from '../hooks/useAsync';
import MovieCard from '../components/MovieCard';

/**
 * Movie catalogue: "Now showing" / "Coming soon" tabs, genre chips,
 * language filter and the header search (`?q=`).
 */
export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [status, setStatus] = useState('now');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('');

  const filters = useAsync(() => movieApi.filters().then((r) => r.data), []);
  const movies = useAsync(
    () =>
      movieApi
        .list({ status, search: q || undefined, genre: genre || undefined, language: language || undefined, limit: 50 })
        .then((r) => r.data),
    [status, q, genre, language],
  );

  const heading = useMemo(() => {
    if (q) return `Results for “${q}”`;
    return status === 'now' ? 'Movies now showing' : 'Coming soon';
  }, [q, status]);

  const clearAll = () => {
    setGenre('');
    setLanguage('');
    setSearchParams({});
  };

  return (
    <div className="container section">
      <div className="catalogue-toolbar">
        <Typography.Title level={3} style={{ margin: 0 }}>
          {heading}
        </Typography.Title>
        <div className="catalogue-controls">
          <Segmented
            value={status}
            onChange={setStatus}
            options={[
              { label: 'Now showing', value: 'now' },
              { label: 'Coming soon', value: 'upcoming' },
            ]}
          />
          <Select
            allowClear
            placeholder="Language"
            style={{ minWidth: 140 }}
            value={language || undefined}
            onChange={(v) => setLanguage(v || '')}
            options={(filters.data?.languages || []).map((l) => ({ label: l, value: l }))}
          />
        </div>
      </div>

      <div className="genre-chips">
        {(filters.data?.genres || []).map((g) => (
          <Tag.CheckableTag key={g} checked={genre === g} onChange={(on) => setGenre(on ? g : '')}>
            {g}
          </Tag.CheckableTag>
        ))}
      </div>

      {movies.error && <Alert type="error" showIcon title={movies.error.message} style={{ marginBottom: 16 }} />}

      {movies.loading && !movies.data ? (
        <div className="movie-grid">
          {Array.from({ length: 10 }, (_, i) => (
            <Skeleton.Node key={i} active style={{ width: '100%', height: 320 }} />
          ))}
        </div>
      ) : movies.data?.length ? (
        <div className="movie-grid">
          {movies.data.map((movie) => (
            <MovieCard key={movie._id} movie={movie} upcoming={status === 'upcoming'} />
          ))}
        </div>
      ) : (
        <Empty description="No movies match your filters" style={{ padding: 48 }}>
          {(q || genre || language) && <Button onClick={clearAll}>Clear filters</Button>}
        </Empty>
      )}
    </div>
  );
}
