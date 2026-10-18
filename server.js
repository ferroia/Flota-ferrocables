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
  vehiculos: [],
  tanqueos: []
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
  
  // Calcular recorrido filtrado por la misma placa
  let recorridoTotal = 0;
  const porPlaca = {};
  flotaState.tanqueos.forEach(t => {
    if (!porPlaca[t.placa]) porPlaca[t.placa] = [];
    porPlaca[t.placa].push(Number(t.kilometraje) || 0);
  });

  Object.values(porPlaca).forEach(kms => {
    if (kms.length > 1) {
      const min = Math.min(...kms);
      const max = Math.max(...kms);
      recorridoTotal += (max - min);
    }
  });

  const rendimientoPromedio = totalGalones > 0 && recorridoTotal > 0 ? (recorridoTotal / totalGalones).toFixed(1) : 0;

  res.json({
    gastoTotalCOP: gastoTotal,
    recorridoAcumuladoKm: recorridoTotal,
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
