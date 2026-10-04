/**
 * Seeds the database with demo users, movies, theatres, a week of shows and
 * a handful of past bookings so dashboards have data from the first login.
 *
 * Usage:
 *   npm run seed                       (uses MONGO_URI from .env)
 *   SEED_CONFIRM=yes npm run seed      (required when NODE_ENV=production)
 *
 * The seed is destructive: it wipes the application collections first.
 */
const mongoose = require('mongoose');

const env = require('../src/config/env');
const User = require('../src/models/User');
const Movie = require('../src/models/Movie');
const Theatre = require('../src/models/Theatre');
const Show = require('../src/models/Show');
const Booking = require('../src/models/Booking');
const SeatHold = require('../src/models/SeatHold');
const Review = require('../src/models/Review');
const { refreshSummary } = require('../src/services/review.service');
const { DEFAULT_LAYOUT, priceSeats } = require('../src/utils/seats');
const { generateTicketCode } = require('../src/services/ticket.service');
const { CONVENIENCE_FEE_PER_TICKET } = require('../src/services/booking.service');
const data = require('./seedData');

const DAY_MS = 24 * 60 * 60 * 1000;
const SHOW_DAYS = 7;
const CLEANING_BUFFER_MINUTES = 15;

/** YYYY-MM-DD of an IST calendar day `offset` days from today. */
function istDate(offset) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(Date.now() + offset * DAY_MS));
}

/** Deterministic pseudo-random generator so every seed run produces the same demo data. */
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

/** Slightly different pricing per theatre makes the demo feel realistic. */
function layoutFor(index) {
  const bump = (index % 3) * 20;
  return {
    seatsPerRow: DEFAULT_LAYOUT.seatsPerRow,
    categories: DEFAULT_LAYOUT.categories.map((c) => ({ ...c, rows: [...c.rows], price: c.price + bump })),
  };
}

/**
 * @param {{ log?: (msg: string) => void }} [options]
 */
async function seed({ log = console.log } = {}) {
  await Promise.all([User, Movie, Theatre, Show, Booking, SeatHold, Review].map((M) => M.deleteMany({})));
  await Promise.all([User, Movie, Theatre, Show, Booking, SeatHold, Review].map((M) => M.syncIndexes()));

  /** Users are created one by one so the bcrypt pre-save hook runs. */
  const users = [];
  for (const u of data.users) users.push(await User.create(u));
  const partners = users.filter((u) => u.role === 'partner');
  const customers = users.filter((u) => u.role === 'user');
  log(`users: ${users.length}`);

  const movies = await Movie.insertMany(
    data.movies.map(({ slug, releaseOffsetDays, ...m }) => ({
      ...m,
      posterUrl: `/posters/${slug}.svg`,
      releaseDate: new Date(`${istDate(releaseOffsetDays)}T00:00:00+05:30`),
    })),
  );
  const nowShowing = movies.filter((m) => m.releaseDate <= new Date());
  log(`movies: ${movies.length} (${nowShowing.length} now showing)`);

  const theatres = await Theatre.insertMany(
    data.theatres.map(({ ownerIndex, ...t }) => ({ ...t, owner: partners[ownerIndex]._id })),
  );
  log(`theatres: ${theatres.length}`);

  /** A week of shows: each screen rotates through the now-showing catalogue. */
  const random = rng(42);
  const shows = [];
  theatres
    .filter((t) => t.status === 'approved')
    .forEach((theatre, tIndex) => {
      for (let day = 0; day < SHOW_DAYS; day += 1) {
        for (let screen = 1; screen <= theatre.screens; screen += 1) {
          data.SHOW_TIMES.forEach((time, slot) => {
            const movie = nowShowing[(tIndex * 3 + screen * 2 + slot + day) % nowShowing.length];
            const startTime = new Date(`${istDate(day)}T${time}:00+05:30`);
            if (startTime < new Date(Date.now() + 30 * 60 * 1000)) return;
            shows.push({
              movie: movie._id,
              theatre: theatre._id,
              screen,
              startTime,
              endTime: new Date(startTime.getTime() + (movie.durationMinutes + CLEANING_BUFFER_MINUTES) * 60 * 1000),
              language: movie.languages[Math.floor(random() * movie.languages.length)],
              format: screen === 1 && tIndex % 2 === 0 ? 'IMAX' : random() > 0.7 ? '3D' : '2D',
              seatLayout: layoutFor(tIndex),
            });
          });
        }
      }
    });
  const createdShows = await Show.insertMany(shows);
  log(`shows: ${createdShows.length}`);

  /**
   * Confirmed bookings: some in the past (for revenue charts) and some on
   * upcoming shows (so the demo customer has tickets to open).
   */
  const bookings = [];
  const pickSeats = (show, count) => {
    const all = show.seatLayout.categories.flatMap((c) =>
      c.rows.flatMap((r) => Array.from({ length: show.seatLayout.seatsPerRow }, (_, i) => `${r}${i + 1}`)),
    );
    const free = all.filter((s) => !show.bookedSeats.includes(s));
    const start = Math.floor(random() * (free.length - count));
    return free.slice(start, start + count);
  };

  const makeBooking = (show, customer, count, confirmedAt) => {
    const seats = pickSeats(show, count);
    const { items, total } = priceSeats(show.seatLayout, seats);
    show.bookedSeats.push(...seats);
    const fee = CONVENIENCE_FEE_PER_TICKET * seats.length;
    bookings.push({
      user: customer._id,
      show: show._id,
      theatre: show.theatre,
      movie: show.movie,
      seats,
      items: items.map(({ seat, category, price }) => ({ seat, category, price })),
      ticketAmount: total,
      convenienceFee: fee,
      totalAmount: total + fee,
      status: 'CONFIRMED',
      payment: {
        provider: 'mock',
        orderId: `order_seed_${bookings.length}_${Date.now()}`,
        paymentId: `pay_seed_${bookings.length}`,
      },
      ticketCode: generateTicketCode(),
      confirmedAt,
      emailSentAt: confirmedAt,
    });
  };

  /** Spread sales over the last 13 days by back-dating confirmation on upcoming shows. */
  for (let i = 0; i < 60; i += 1) {
    const show = createdShows[Math.floor(random() * createdShows.length)];
    const customer = customers[i % customers.length];
    const daysAgo = Math.floor(random() * 13);
    makeBooking(show, customer, 1 + Math.floor(random() * 4), new Date(Date.now() - daysAgo * DAY_MS - random() * DAY_MS / 2));
  }

  /** Guaranteed upcoming tickets for the main demo customer. */
  const demoCustomer = customers[0];
  [createdShows[5], createdShows[Math.floor(createdShows.length / 2)]].forEach((show) =>
    makeBooking(show, demoCustomer, 2, new Date()),
  );

  /**
   * Yesterday's evening shows that every demo customer attended. Attendance
   * is what unlocks writing a review, so the demo starts with real ratings
   * and the demo customer can review these movies straight away.
   */
  const approvedTheatres = theatres.filter((t) => t.status === 'approved');
  const pastShows = await Show.insertMany(
    nowShowing.slice(0, 6).map((movie, i) => {
      const theatre = approvedTheatres[i % approvedTheatres.length];
      const startTime = new Date(`${istDate(-1)}T${i % 2 ? '18:30' : '21:30'}:00+05:30`);
      return {
        movie: movie._id,
        theatre: theatre._id,
        screen: 1,
        startTime,
        endTime: new Date(startTime.getTime() + (movie.durationMinutes + CLEANING_BUFFER_MINUTES) * 60 * 1000),
        language: movie.languages[0],
        format: '2D',
        seatLayout: layoutFor(i),
      };
    }),
  );
  pastShows.forEach((show) => customers.forEach((c) => makeBooking(show, c, 2, new Date(Date.now() - 2 * DAY_MS))));

  await Booking.insertMany(bookings);
  await Promise.all(
    [...createdShows, ...pastShows].map((s) => Show.updateOne({ _id: s._id }, { bookedSeats: s.bookedSeats })),
  );
  log(`bookings: ${bookings.length}`);

  /** Reviews from the attendees, leaving the first movie unreviewed by the demo customer. */
  const reviews = [];
  pastShows.forEach((show, i) =>
    customers.forEach((customer, j) => {
      if (i === 0 && j === 0) return;
      const sample = data.reviews[(i * customers.length + j) % data.reviews.length];
      reviews.push({ movie: show.movie, user: customer._id, rating: sample.rating, comment: sample.comment });
    }),
  );
  await Review.insertMany(reviews);
  await Promise.all(pastShows.map((s) => refreshSummary(s.movie)));
  log(`reviews: ${reviews.length}`);

  return { users: users.length, movies: movies.length, theatres: theatres.length, shows: createdShows.length };
}

/** CLI entry point. */
if (require.main === module) {
  (async () => {
    if (env.isProd && process.env.SEED_CONFIRM !== 'yes') {
      console.error('Refusing to wipe a production database. Re-run with SEED_CONFIRM=yes.');
      process.exit(1);
    }
    await mongoose.connect(env.mongoUri);
    console.log(`Seeding ${mongoose.connection.name}...`);
    await seed();
    await mongoose.disconnect();
    console.log('Done. Demo logins: admin@reelseat.dev / Admin@123, partner@reelseat.dev / Partner@123, user@reelseat.dev / User@1234');
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { seed };
