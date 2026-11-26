const express = require('express');
const helmet = require('helmet');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();

// Security headers. CSP says exactly what the browser may load.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

app.use(express.json({ limit: '10kb' })); // reject huge request bodies
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Spark Solution' });
});

app.use('/api', apiRoutes);

// Unknown API route
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Bad JSON, too-large body, or any crash: never leak details to the visitor
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong.' });
});

module.exports = app;
