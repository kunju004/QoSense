require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const helmet    = require('helmet');
const morgan    = require('morgan');
const rateLimit = require('express-rate-limit');

const authRoutes      = require('./routes/auth');
const runsRoutes      = require('./routes/runs');
const schedulerRoutes = require('./routes/scheduler');
const analyticsRoutes = require('./routes/analytics');
const errorHandler    = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(morgan('dev'));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

app.get('/health', (req, res) => res.json({ status: 'ok', llmProvider: process.env.LLM_PROVIDER || 'mock' }));
app.use('/api/auth',      authRoutes);
app.use('/api/runs',      runsRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use((req, res) => res.status(404).json({ error: `Route ${req.path} not found` }));
app.use(errorHandler);

app.listen(PORT, () => {
  console.log('QoS Scheduler API running on http://localhost:' + PORT);
  console.log('LLM Provider: ' + (process.env.LLM_PROVIDER || 'mock'));
});

module.exports = app;
