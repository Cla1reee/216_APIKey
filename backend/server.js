const express = require('express');
const crypto = require('crypto'); // Modul bawaan untuk kriptografi
const cors = require('cors');

const app = express();
const PORT = 3000;

// Izinkan frontend (dari asal yang berbeda) untuk mengakses API ini
app.use(cors());

// Endpoint untuk generate API key
app.get('/generate-key', (req, res) => {
  try {
    // Membuat 32 byte data acak
    const buffer = crypto.randomBytes(32);
    // Mengubahnya menjadi string hex (akan jadi 64 karakter)
    const apiKey = buffer.toString('hex');

    // Mengirim key kembali sebagai JSON
    res.json({ apiKey: apiKey });

  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server berjalan di http://localhost:${PORT}`);
});