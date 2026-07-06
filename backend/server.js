try { require('dotenv').config(); } catch {}
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createDB } = require('./db/database');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

async function start() {
  await createDB();
  const authRoutes = require('./routes/auth');
  const menuRoutes = require('./routes/menu');
  const apiRoutes  = require('./routes/api');

  app.use('/api/auth', authRoutes);
  app.use('/api/menu', menuRoutes);
  app.use('/api', apiRoutes);

  app.get('/admin*', (req,res) => res.sendFile(path.join(__dirname,'../frontend/admin/index.html')));
  app.get('*',       (req,res) => res.sendFile(path.join(__dirname,'../frontend/index.html')));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`☕ Liberty → http://localhost:${PORT}  |  /admin`));
}
start().catch(console.error);
