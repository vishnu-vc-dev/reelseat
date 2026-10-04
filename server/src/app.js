const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const morgan = require('morgan');

const env = require('./config/env');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

if (env.trustProxy) app.set('trust proxy', env.trustProxy);

app.use(
  cors({
    origin: env.clientUrls,
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', uptime: process.uptime() });
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
