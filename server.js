const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'datos_flota.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const datosIniciales = {
  vehiculos: [
    { id: 'v1', placa: 'JGT-456', modelo: 'NPR Chevrolet', tipo: 'Camión', estado: 'Activo' },
    { id: 'v2', placa: 'TSU-123', modelo: 'NHR Chevrolet', tipo: 'Camión', estado: 'Activo' },
    { id: 'v3', placa: 'EKO-890', modelo: 'Carry Suzuki', tipo: 'Van', estado: 'Activo' }
  ],
  tanqueos: [
    { id: 't1', vehiculoId: 'v1', placa: 'JGT-456', fecha: '2026-10-10', galones: 18.5, costoCOP: 285000, kilometraje: 142500 },
    { id: 't2', vehiculoId: 'v2', placa: 'TSU-123', fecha: '2026-10-12', galones: 12.0, costoCOP: 180000, kilometraje: 98200 },
    { id: 't3', vehiculoId: 'v1', placa: 'JGT-456', fecha: '2026-10-15', galones: 20.0, costoCOP: 310000, kilometraje: 143100 }
  ]
};

function cargarDatos() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const contenido = fs.readFileSync(DATA_FILE, 'utf-8');
      const parseado = JSON.parse(contenido);
      if (parseado && parseado.tanqueos) return parseado;
    }
  } catch (e) {
    console.error('Error leyendo datos_flota.json:', e);
  }
  guardarDatos(datosIniciales);
  return datosIniciales;
}

function guardarDatos(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error guardando datos_flota.json:', e);
  }
}

let flotaState = cargarDatos();

app.get('/api/v1/flota/dashboard', (req, res) => {
  const gastoTotal = flotaState.tanqueos.reduce((acc, t) => acc + (Number(t.costoCOP) || 0), 0);
  const totalGalones = flotaState.tanqueos.reduce((acc, t) => acc + (Number(t.galones) || 0), 0);
  
  const kms = flotaState.tanqueos.map(t => Number(t.kilometraje) || 0).filter(k => k > 0);
  const minKm = kms.length > 0 ? Math.min(...kms) : 0;
  const maxKm = kms.length > 0 ? Math.max(...kms) : 0;
  const recorridoAcumulado = maxKm > minKm ? (maxKm - minKm) : 1250;
  const rendimientoPromedio = totalGalones > 0 ? (recorridoAcumulado / totalGalones).toFixed(1) : 0;

  res.json({
    gastoTotalCOP: gastoTotal,
    recorridoAcumuladoKm: recorridoAcumulado,
    rendimientoPromedio: rendimientoPromedio,
    vehiculosCount: flotaState.vehiculos.length,
    tanqueosCount: flotaState.tanqueos.length,
    vehiculos: flotaState.vehiculos,
    tanqueos: flotaState.tanqueos
  });
});

app.post('/api/v1/flota/tanqueos', (req, res) => {
  const nuevo = { id: 't_' + Date.now(), ...req.body };
  flotaState.tanqueos.push(nuevo);
  guardarDatos(flotaState);
  res.status(201).json(nuevo);
});

app.post('/api/v1/flota/vehiculos', (req, res) => {
  const nuevo = { id: 'v_' + Date.now(), ...req.body };
  flotaState.vehiculos.push(nuevo);
  guardarDatos(flotaState);
  res.status(201).json(nuevo);
});

app.listen(PORT, () => console.log('Servidor Flota en puerto ' + PORT));
