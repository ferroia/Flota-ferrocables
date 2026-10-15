const express = require('express');
const cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

// Datos iniciales
db.defaults({
  vehiculos: [
    {
      id: 1,
      placa: "OLN646",
      conductor: "Andrés López",
      kmActual: 64000,
      proxAceiteKm: 69000,
      vencSoat: "2027-05-15",
      vencTecno: "2027-08-20"
    }
  ],
  tanqueos: [
    {
      id: 1,
      vehiculo_id: 1,
      fecha: "2026-10-01",
      galones: 12.5,
      costo_total_cop: 180000,
      distancia_km: 420
    }
  ]
}).write();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Rutas de API para el frontend
app.get('/api/v1/dashboard', (req, res) => {
  const vehiculos = db.get('vehiculos').value() || [];
  const tanqueos = db.get('tanqueos').value() || [];

  const totalGastoCop = tanqueos.reduce((sum, t) => sum + (t.costo_total_cop || 0), 0);
  const totalGalones = tanqueos.reduce((sum, t) => sum + (t.galones || 0), 0);
  const totalKmRecorridos = tanqueos.reduce((sum, t) => sum + (t.distancia_km || 0), 0);

  res.json({
    vehiculos,
    tanqueos,
    resumen: {
      totalGastoCop,
      totalGalones,
      totalKmRecorridos
    }
  });
});

app.get('/api/v1/vehiculos', (req, res) => {
  res.json(db.get('vehiculos').value() || []);
});

app.get('/api/v1/tanqueos', (req, res) => {
  res.json(db.get('tanqueos').value() || []);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
