/**
 * Generates the SVG posters used by the demo seed data.
 *
 * The seeded films are fictional, so instead of borrowing copyrighted
 * artwork each poster is drawn from a small design system: a two-stop
 * gradient, a genre motif and typographic title treatment.
 *
 *   node scripts/generate-posters.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'posters');
mkdirSync(outDir, { recursive: true });

const posters = [
  { slug: 'monsoon-express', title: 'Monsoon Express', tagline: 'One night. One train. No way off.', from: '#0f2027', to: '#2c5364', accent: '#7fd1ff', motif: 'rain' },
  { slug: 'the-last-lighthouse', title: 'The Last Lighthouse', tagline: 'The sea remembers.', from: '#141e30', to: '#243b55', accent: '#ffd36e', motif: 'beam' },
  { slug: 'kaalam', title: 'Kaalam', tagline: 'Your future is calling.', from: '#200122', to: '#6f0000', accent: '#ff9a3c', motif: 'rings' },
  { slug: 'laugh-riot-2', title: 'Laugh Riot 2', tagline: 'Three weddings. One goat.', from: '#f7971e', to: '#ffd200', accent: '#d7263d', tagColor: '#ffffff', motif: 'confetti' },
  { slug: 'starbound', title: 'Starbound', tagline: 'They are not alone on board.', from: '#000428', to: '#004e92', accent: '#e0e7ff', motif: 'stars' },
  { slug: 'rangoli', title: 'Rangoli', tagline: 'Some homes are never sold.', from: '#8e2de2', to: '#ff6a88', accent: '#ffe066', motif: 'rangoli' },
  { slug: 'shadow-protocol', title: 'Shadow Protocol', tagline: 'Her name is on the list.', from: '#0b0b0b', to: '#3a3a3a', accent: '#e63946', motif: 'grid' },
  { slug: 'little-big-paws', title: 'Little Big Paws', tagline: 'Every street leads home.', from: '#56ab2f', to: '#a8e063', accent: '#ffffff', motif: 'paws' },
  { slug: 'veera', title: 'Veera', tagline: 'The fort will not fall.', from: '#3e1f00', to: '#b8860b', accent: '#ffe8a3', motif: 'sun' },
  { slug: 'echoes-of-dawn', title: 'Echoes of Dawn', tagline: 'Same café. Different time.', from: '#ee9ca7', to: '#ffdde1', accent: '#6d2e46', tagColor: '#ffe4ea', motif: 'waves' },
  { slug: 'neon-nights', title: 'Neon Nights', tagline: 'One last ride.', from: '#12001f', to: '#3d0066', accent: '#00f5d4', motif: 'neon' },
  { slug: 'mission-gaganyaan', title: 'Mission Gaganyaan', tagline: 'A billion dreams. One orbit.', from: '#000000', to: '#0b3d91', accent: '#ff9933', motif: 'orbit' },
];

/** Tiny deterministic PRNG so posters are identical on every run. */
function prng(seed) {
  let s = [...seed].reduce((a, c) => a + c.charCodeAt(0), 0);
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Genre-flavoured decorative layer. */
function motif(kind, accent, rand) {
  const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');
  switch (kind) {
    case 'rain':
      return many(70, () => {
        const x = rand() * 400;
        const y = rand() * 600;
        return `<line x1="${x}" y1="${y}" x2="${x - 8}" y2="${y + 30}" stroke="${accent}" stroke-opacity="0.35" stroke-width="1.5"/>`;
      });
    case 'beam':
      return `<polygon points="200,170 -40,60 -40,300" fill="${accent}" opacity="0.18"/><polygon points="200,170 440,60 440,300" fill="${accent}" opacity="0.12"/>
        <rect x="185" y="170" width="30" height="230" fill="${accent}" opacity="0.6"/><circle cx="200" cy="170" r="18" fill="${accent}"/>`;
    case 'rings':
      return many(7, (i) => `<circle cx="200" cy="230" r="${30 + i * 26}" fill="none" stroke="${accent}" stroke-opacity="${0.7 - i * 0.08}" stroke-width="2"/>`);
    case 'confetti':
      return many(60, () => `<rect x="${rand() * 400}" y="${rand() * 420}" width="8" height="14" rx="2" fill="${rand() > 0.5 ? accent : '#ffffff'}" opacity="0.8" transform="rotate(${rand() * 180} ${rand() * 400} ${rand() * 420})"/>`);
    case 'stars':
      return many(120, () => `<circle cx="${rand() * 400}" cy="${rand() * 600}" r="${rand() * 1.8 + 0.3}" fill="${accent}" opacity="${rand() * 0.8 + 0.2}"/>`) +
        `<circle cx="300" cy="150" r="60" fill="${accent}" opacity="0.15"/>`;
    case 'rangoli':
      return many(12, (i) => `<ellipse cx="200" cy="230" rx="120" ry="34" fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="2" transform="rotate(${i * 15} 200 230)"/>`) +
        `<circle cx="200" cy="230" r="22" fill="${accent}" opacity="0.8"/>`;
    case 'grid':
      return many(20, (i) => `<line x1="${i * 20}" y1="0" x2="${i * 20}" y2="600" stroke="#ffffff" stroke-opacity="0.05"/>`) +
        `<circle cx="200" cy="220" r="90" fill="none" stroke="${accent}" stroke-width="3"/><line x1="200" y1="110" x2="200" y2="330" stroke="${accent}" stroke-width="2"/><line x1="90" y1="220" x2="310" y2="220" stroke="${accent}" stroke-width="2"/>`;
    case 'paws':
      return many(8, (i) => {
        const x = 60 + (i % 4) * 90;
        const y = 120 + Math.floor(i / 4) * 150 + (i % 2) * 30;
        return `<g fill="${accent}" opacity="0.55"><ellipse cx="${x}" cy="${y + 22}" rx="18" ry="15"/><circle cx="${x - 16}" cy="${y}" r="7"/><circle cx="${x - 5}" cy="${y - 8}" r="7"/><circle cx="${x + 7}" cy="${y - 8}" r="7"/><circle cx="${x + 17}" cy="${y}" r="7"/></g>`;
      });
    case 'sun':
      return many(24, (i) => `<line x1="200" y1="240" x2="${200 + Math.cos((i * Math.PI) / 12) * 260}" y2="${240 + Math.sin((i * Math.PI) / 12) * 260}" stroke="${accent}" stroke-opacity="0.25" stroke-width="3"/>`) +
        `<circle cx="200" cy="240" r="70" fill="${accent}" opacity="0.85"/><path d="M60 400 L130 300 L170 340 L230 260 L300 350 L340 310 L360 400 Z" fill="#1a0d00" opacity="0.8"/>`;
    case 'waves':
      return many(8, (i) => `<path d="M0 ${200 + i * 28} Q100 ${170 + i * 28} 200 ${200 + i * 28} T400 ${200 + i * 28}" fill="none" stroke="${accent}" stroke-opacity="${0.15 + i * 0.05}" stroke-width="2"/>`);
    case 'neon':
      return `<rect x="60" y="110" width="280" height="200" rx="16" fill="none" stroke="${accent}" stroke-width="4" opacity="0.9"/>
        <rect x="90" y="140" width="220" height="140" rx="10" fill="none" stroke="#ff2e97" stroke-width="3" opacity="0.8"/>` +
        many(30, () => `<line x1="${rand() * 400}" y1="${330 + rand() * 120}" x2="${rand() * 400}" y2="${330 + rand() * 120}" stroke="#ff2e97" stroke-opacity="0.25"/>`);
    case 'orbit':
      return `<ellipse cx="200" cy="230" rx="160" ry="50" fill="none" stroke="${accent}" stroke-width="2" opacity="0.8" transform="rotate(-20 200 230)"/>
        <circle cx="200" cy="230" r="60" fill="#1e5aa8"/><circle cx="185" cy="215" r="60" fill="#3f86d9" opacity="0.5"/>
        <circle cx="340" cy="185" r="8" fill="${accent}"/>` +
        many(60, () => `<circle cx="${rand() * 400}" cy="${rand() * 420}" r="${rand() * 1.4 + 0.3}" fill="#ffffff" opacity="0.7"/>`);
    default:
      return '';
  }
}

/** Splits long titles over two lines so they stay readable at card size. */
function titleLines(title) {
  if (title.length <= 12) return [title];
  const words = title.split(' ');
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

for (const p of posters) {
  const rand = prng(p.slug);
  const lines = titleLines(p.title.toUpperCase());
  const size = lines.length > 1 ? 44 : 56;
  const titleSvg = lines
    .map((line, i) => `<text x="200" y="${470 + i * (size + 4) - (lines.length - 1) * 24}" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="${size}" fill="#ffffff" letter-spacing="2">${escapeXml(line)}</text>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600" width="400" height="600" role="img" aria-label="${escapeXml(p.title)} poster">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${p.from}"/><stop offset="1" stop-color="${p.to}"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.85"/></linearGradient>
  </defs>
  <rect width="400" height="600" fill="url(#bg)"/>
  ${motif(p.motif, p.accent, rand)}
  <rect width="400" height="600" fill="url(#fade)"/>
  ${titleSvg}
  <text x="200" y="560" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="${p.tagColor || p.accent}" letter-spacing="1">${escapeXml(p.tagline.toUpperCase())}</text>
</svg>
`;
  writeFileSync(join(outDir, `${p.slug}.svg`), svg);
}

console.log(`Generated ${posters.length} posters in ${outDir}`);
