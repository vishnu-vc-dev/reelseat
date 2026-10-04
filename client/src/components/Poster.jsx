import { useState } from 'react';

/**
 * Movie poster with a graceful fallback: if the image URL is missing or
 * broken (e.g. an admin pasted a bad link), a branded gradient tile with the
 * title is shown instead of a broken-image icon.
 */
export default function Poster({ src, title, className = '' }) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div className={`poster poster-fallback ${className}`} role="img" aria-label={`${title} poster`}>
        <span>{title}</span>
      </div>
    );
  }

  return (
    <img
      className={`poster ${className}`}
      src={src}
      alt={`${title} poster`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
