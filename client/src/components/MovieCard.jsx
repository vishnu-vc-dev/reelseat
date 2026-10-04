import { Link } from 'react-router-dom';
import { Tag } from 'antd';
import Poster from './Poster';
import { formatDate } from '../utils/format';

/**
 * Catalogue tile. Upcoming movies show their release date instead of genres
 * so customers know when booking opens.
 */
export default function MovieCard({ movie, upcoming = false }) {
  return (
    <Link to={`/movies/${movie._id}`} className="movie-card">
      <div className="movie-card-poster">
        <Poster src={movie.posterUrl} title={movie.title} />
        <Tag className="movie-card-cert">{movie.certificate}</Tag>
      </div>
      <div className="movie-card-body">
        <div className="movie-card-title">{movie.title}</div>
        <div className="movie-card-meta">
          {upcoming ? `Releasing ${formatDate(movie.releaseDate)}` : movie.genres.join(' / ')}
        </div>
        <div className="movie-card-meta">{movie.languages.join(', ')}</div>
      </div>
    </Link>
  );
}
