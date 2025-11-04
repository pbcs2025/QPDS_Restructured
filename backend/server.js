const app = require('./src/app');

const PORT = process.env.PORT || 5005;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Kill the process using that port or set PORT env var to a free port.`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

