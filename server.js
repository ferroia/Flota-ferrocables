const express = require('express');
const cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const adapter = new FileSync('db.json');
const db = low(adapter);

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
  tanqueos: []
}).write();

function calcularDiasRestantes(fechaStr) {
  if (!fechaStr) return 999;
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const fechaDoc = new Date(fechaStr + 'T00:00:00');
  const difMs = fechaDoc - hoy;
  return Math.ceil(difMs / (1000 * 60 * 60 * 24));
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

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

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html', (err) => {
    if (err) {
      res.send('API Flota Ferrocables activa');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
