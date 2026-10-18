const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'datos_flota.json');

app.use(cors());
app.use(express.json());

// Anular todo tipo de caché en el navegador
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(__dirname));

const datosIniciales = { vehiculos: [], tanqueos: [], mantenimientos: [], documentos: [] };

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

  let recorridoTotal = 0;
  const porPlaca = {};
  flotaState.tanqueos.forEach(t => {
    if (!porPlaca[t.placa]) porPlaca[t.placa] = [];
    porPlaca[t.placa].push(Number(t.kilometraje) || 0);
  });

  Object.values(porPlaca).forEach(kms => {
    if (kms.length > 1) recorridoTotal += (Math.max(...kms) - Math.min(...kms));
  });

  const rendimientoPromedio = totalGalones > 0 && recorridoTotal > 0 ? (recorridoTotal / totalGalones).toFixed(1) : 0;

  const datosMeses = {};
  flotaState.tanqueos.forEach(t => {
    const mes = t.fecha ? t.fecha.substring(0, 7) : 'Sin Fecha';
    if (!datosMeses[mes]) datosMeses[mes] = { gastoCombustible: 0, gastoMaint: 0, galones: 0, kmsPorPlaca: {} };
    datosMeses[mes].gastoCombustible += Number(t.costoCOP) || 0;
    datosMeses[mes].galones += Number(t.galones) || 0;
    if (!datosMeses[mes].kmsPorPlaca[t.placa]) datosMeses[mes].kmsPorPlaca[t.placa] = [];
    datosMeses[mes].kmsPorPlaca[t.placa].push(Number(t.kilometraje) || 0);
  });

  flotaState.mantenimientos.forEach(m => {
    const mes = m.fecha ? m.fecha.substring(0, 7) : 'Sin Fecha';
    if (!datosMeses[mes]) datosMeses[mes] = { gastoCombustible: 0, gastoMaint: 0, galones: 0, kmsPorPlaca: {} };
    datosMeses[mes].gastoMaint += Number(m.costoCOP) || 0;
  });

  const reportesMensuales = Object.keys(datosMeses).sort().map(mes => {
    const info = datosMeses[mes];
    let kmMes = 0;
    Object.values(info.kmsPorPlaca).forEach(kms => {
      if (kms.length > 1) kmMes += (Math.max(...kms) - Math.min(...kms));
    });
    const rendMes = info.galones > 0 && kmMes > 0 ? (kmMes / info.galones).toFixed(1) : 0;
    return {
      mes,
      gastoCombustible: info.gastoCombustible,
      gastoMaint: info.gastoMaint,
      gastoTotal: info.gastoCombustible + info.gastoMaint,
      kmRecorridos: kmMes,
      rendimientoKmGal: Number(rendMes)
    };
  });

  res.json({
    gastoTotalCOP: gastoTotal,
    recorridoAcumuladoKm: recorridoTotal,
    rendimientoPromedio: rendimientoPromedio,
    reportesMensuales: reportesMensuales,
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

app.listen(PORT, () => console.log('Servidor en puerto ' + PORT));
