const express = require('express');
const crypto = require('crypto');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize'); // Impor Sequelize
const { v4: uuidv4 } = require('uuid'); // Impor UUID

const app = express();
const PORT = 3000;

// --- 1. Setup Database (MySQL via Laragon by default) ---
const DB_NAME = process.env.DB_NAME || 'api_key_db';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306;

const mysql = require('mysql2/promise');

async function ensureDatabase() {
  try {
    const conn = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
    });
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await conn.end();
    console.log(`Database ensured: ${DB_NAME}`);
  } catch (err) {
    console.error('Gagal membuat/mengecek database:', err);
    throw err;
  }
}

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,
});

// Model dengan kolom lastUsed untuk validasi
const ApiKey = sequelize.define('ApiKey', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  apiName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  apiKey: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  lastUsed: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
});

app.use(cors());
app.use(express.json());

// Simple request logger
app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Backend is up' });
});

// Generate key (existing)
app.post('/generate-key', async (req, res) => {
  try {
    const { username, apiName } = req.body;
    if (!username || !apiName) return res.status(400).json({ error: 'Username dan Nama API wajib diisi' });

    const newUUID = uuidv4();
    const generatedApiKey = `key_${crypto.randomBytes(24).toString('hex')}`;
    const generatedApiSecret = `secret_${crypto.randomBytes(36).toString('base64url')}`;

    const newKey = await ApiKey.create({ id: newUUID, username, apiName, apiKey: generatedApiKey });

    res.status(201).json({ id: newKey.id, username: newKey.username, apiName: newKey.apiName, apiKey: newKey.apiKey, apiSecret: generatedApiSecret, createdAt: newKey.createdAt });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// New: validate key endpoint under /api
app.post('/api/validate-key', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ success: false, message: 'apiKey wajib disertakan' });

    const found = await ApiKey.findOne({ where: { apiKey } });
    if (!found) {
      return res.status(404).json({ success: false, message: 'API Key tidak ditemukan' });
    }

    // Update lastUsed timestamp
    found.lastUsed = new Date();
    await found.save();

    return res.json({
      success: true,
      message: 'API Key valid',
      data: {
        username: found.username,
        apiName: found.apiName,
        createdAt: found.createdAt,
        lastUsed: found.lastUsed,
      }
    });

  } catch (err) {
    console.error('Error validating API key:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// New: Create API Key endpoint format like screenshot (POST /api/apikey)
app.post('/api/apikey', async (req, res) => {
  try {
    const { username, name } = req.body;
    if (!username || !name) {
      return res.status(400).json({ success: false, message: 'username dan name wajib diisi' });
    }

    const newUUID = uuidv4();
    const generatedApiKey = `key_${crypto.randomBytes(24).toString('hex')}`;

    const newKey = await ApiKey.create({
      id: newUUID,
      username: username,
      apiName: name,
      apiKey: generatedApiKey,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: newKey.id,
        username: newKey.username,
        name: newKey.apiName,
        key: newKey.apiKey,
        createdAt: newKey.createdAt,
      }
    });

  } catch (err) {
    console.error('Error creating API key:', err);
    res.status(500).json({ success: false, message: 'Failed to create API key' });
  }
});

// Alias: POST /api/keys (same as /api/apikey)
app.post('/api/keys', async (req, res) => {
  try {
    const { username, name } = req.body;
    console.log(`[/api/keys] received request: username="${username}", name="${name}"`);
    
    if (!username || !name) {
      console.log('[/api/keys] validation failed: missing username or name');
      return res.status(400).json({ success: false, message: 'username dan name wajib diisi' });
    }

    const newUUID = uuidv4();
    const generatedApiKey = `key_${crypto.randomBytes(24).toString('hex')}`;
    const generatedApiSecret = `secret_${crypto.randomBytes(36).toString('base64url')}`;

    console.log(`[/api/keys] creating key: id=${newUUID}, username=${username}, name=${name}`);
    const newKey = await ApiKey.create({
      id: newUUID,
      username: username,
      apiName: name,
      apiKey: generatedApiKey,
    });

    console.log(`[/api/keys] key created successfully in DB`);
    const response = {
      success: true,
      data: {
        id: newKey.id,
        username: newKey.username,
        name: newKey.apiName,
        key: newKey.apiKey,
        secret: generatedApiSecret,
        createdAt: newKey.createdAt,
      }
    };
    console.log(`[/api/keys] sending response:`, response);
    return res.status(201).json(response);

  } catch (err) {
    console.error('[/api/keys] Error creating API key:', err);
    res.status(500).json({ success: false, message: 'Failed to create API key', error: err.message });
  }
});

(async () => {
  try {
    await ensureDatabase();
    await sequelize.sync();
    console.log('Database & tabel berhasil disinkronkan.');
    app.listen(PORT, () => console.log(`Backend server berjalan di http://localhost:${PORT}`));
  } catch (err) {
    console.error('Gagal sinkronasi database:', err);
  }
})();
