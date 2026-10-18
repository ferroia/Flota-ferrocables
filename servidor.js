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
  tanqueos: [],
  mantenimientos: []
};

function cargarDatos() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const contenido = fs.readFileSync(DATA_FILE, 'utf-8');
      const parseado = JSON.parse(contenido);
      if (parseado) return { ...datosIniciales, ...parseado };
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
  const gastoTanqueos = flotaState.tanqueos.reduce((acc, t) => acc + (Number(t.costoCOP) || 0), 0);
  const gastoMantenimiento = flotaState.mantenimientos.reduce((acc, m) => acc + (Number(m.costoCOP) || 0), 0);
  const gastoTotal = gastoTanqueos + gastoMantenimiento;

  const totalGalones = flotaState.tanqueos.reduce((acc, t) => acc + (Number(t.galones) || 0), 0);

  // Recorrido global
  let recorridoTotal = 0;
  const porPlaca = {};
  flotaState.tanqueos.forEach(t => {
    if (!porPlaca[t.placa]) porPlaca[t.placa] = [];
    porPlaca[t.placa].push(Number(t.kilometraje) || 0);
  });

  Object.values(porPlaca).forEach(kms => {
    if (kms.length > 1) {
      recorridoTotal += (Math.max(...kms) - Math.min(...kms));
    }
  });

  const rendimientoPromedio = totalGalones > 0 && recorridoTotal > 0 ? (recorridoTotal / totalGalones).toFixed(1) : 0;

  // Procesamiento de datos mensuales para las gráficas
  const mesesMap = {};

  flotaState.tanqueos.forEach(t => {
    if (!t.fecha) return;
    const mesKey = t.fecha.substring(0, 7); // AAAA-MM
    if (!mesesMap[mesKey]) {
      mesesMap[mesKey] = { mes: mesKey, gastoCombustible: 0, gastoMaint: 0, galones: 0, kmsByPlaca: {} };
    }
    mesesMap[mesKey].gastoCombustible += Number(t.costoCOP) || 0;
    mesesMap[mesKey].galones += Number(t.galones) || 0;

    if (!mesesMap[mesKey].kmsByPlaca[t.placa]) mesesMap[mesKey].kmsByPlaca[t.placa] = [];
    mesesMap[mesKey].kmsByPlaca[t.placa].push(Number(t.kilometraje) || 0);
  });

  flotaState.mantenimientos.forEach(m => {
    if (!m.fecha) return;
    const mesKey = m.fecha.substring(0, 7);
    if (!mesesMap[mesKey]) {
      mesesMap[mesKey] = { mes: mesKey, gastoCombustible: 0, gastoMaint: 0, galones: 0, kmsByPlaca: {} };
    }
    mesesMap[mesKey].gastoMaint += Number(m.costoCOP) || 0;
  });

  const historialMensual = Object.keys(mesesMap).sort().map(mKey => {
    const item = mesesMap[mKey];
    let kmMes = 0;
    Object.values(item.kmsByPlaca).forEach(kms => {
      if (kms.length > 1) kmMes += (Math.max(...kms) - Math.min(...kms));
    });

    const rendMes = item.galones > 0 && kmMes > 0 ? (kmMes / item.galones).toFixed(1) : 0;

    return {
      mes: item.mes,
      gastoCombustible: item.gastoCombustible,
      gastoMantenimiento: item.gastoMaint,
      gastoTotalMes: item.gastoCombustible + item.gastoMaint,
      kilometrosMes: kmMes,
      rendimientoMes: Number(rendMes)
    };
  });

  res.json({
    gastoTotalCOP: gastoTotal,
    gastoTanqueosCOP: gastoTanqueos,
    gastoMantenimientoCOP: gastoMantenimiento,
    recorridoAcumuladoKm: recorridoTotal,
    rendimientoPromedio: rendimientoPromedio,
    historialMensual: historialMensual,
    vehiculos: flotaState.vehiculos,
    tanqueos: flotaState.tanqueos,
    mantenimientos: flotaState.mantenimientos
  });
});

app.post('/api/v1/flota/tanqueos', (req, res) => {
  const nuevo = { id: 't_' + Date.now(), ...req.body };
  flotaState.tanqueos.push(nuevo);
  guardarDatos(flotaState);
  res.status(201).json(nuevo);
});

app.post('/api/v1/flota/mantenimientos', (req, res) => {
  const nuevo = { id: 'm_' + Date.now(), ...req.body };
  flotaState.mantenimientos.push(nuevo);
  guardarDatos(flotaState);
  res.status(201).json(nuevo);
});

app.post('/api/v1/flota/vehiculos', (req, res) => {
  const nuevo = { id: 'v_' + Date.now(), ...req.body };
  flotaState.vehiculos.push(nuevo);
  guardarDatos(flotaState);
  res.status(201).json(nuevo);
});

app.listen(PORT, () => console.log('Servidor Flota con Gráficas en puerto ' + PORT));
