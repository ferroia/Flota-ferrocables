import express from 'express';
import cors from 'cors';
import { JSONFilePreset } from 'lowdb/node';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const defaultData = { 
  vehiculos: [
    { 
      id: 1, 
      placa: 'OLN64G', 
      conductor: 'Andrés López', 
      kmActual: 64000, 
      proxAceiteKm: 69000,
      vencSoat: '2027-05-15',
      vencTecno: '2027-08-20'
    }
  ],
  tanqueos: [] 
};

const db = await JSONFilePreset('db.json', defaultData);

function calcularDiasRestantes(fechaStr) {
  if (!fechaStr) return 999;
  const hoy = new Date();
  hoy.setHours(0,0,0,0);
  const fechaDoc = new Date(fechaStr + 'T00:00:00');
  const difMs = fechaDoc - hoy;
  return Math.ceil(difMs / (1000 * 60 * 60 * 24));
}

// GET: Dashboard con analítica mensual y desglose diario
app.get('/api/v1/dashboard', async (req, res) => {
  await db.read();
  const { vehiculos, tanqueos } = db.data;

  const totalGastoCop = tanqueos.reduce((sum, t) => sum + t.costo_total_cop, 0);
  const totalGalones = tanqueos.reduce((sum, t) => sum + t.galones, 0);
  const totalKmRecorridos = tanqueos.reduce((sum, t) => sum + t.distancia_km, 0);

  // Mapear alertas de vehículos
  const vehiculosConEstado = vehiculos.map(v => {
    const diasSoat = calcularDiasRestantes(v.vencSoat);
    const diasTecno = calcularDiasRestantes(v.vencTecno);
    const alertaAceite = v.kmActual >= v.proxAceiteKm;

    return {
      ...v,
      diasSoat,
      diasTecno,
      alertaAceite,
      alertaDocumentos: diasSoat <= 30 || diasTecno <= 30
    };
  });

  // Agrupar por Conductor
  const analiticaConductores = {};
  tanqueos.forEach(t => {
    const conductor = t.conductor || 'Sin Asignar';
    if (!analiticaConductores[conductor]) {
      analiticaConductores[conductor] = { conductor, kmTotales: 0, gastoTotalCop: 0 };
    }
    analiticaConductores[conductor].kmTotales += t.distancia_km;
    analiticaConductores[conductor].gastoTotalCop += t.costo_total_cop;
  });

  // Agrupar por Mes (Formato YYYY-MM)
  const analiticaMensual = {};
  tanqueos.forEach(t => {
    // Extraer YYYY-MM de la fechaISO o fecha de registro
    const fechaObj = t.fechaISO ? new Date(t.fechaISO) : new Date();
    const mesKey = `${fechaObj.getFullYear()}-${String(fechaObj.getMonth() + 1).padStart(2, '0')}`;
    const diaKey = `${mesKey}-${String(fechaObj.getDate()).padStart(2, '0')}`;

    if (!analiticaMensual[mesKey]) {
      analiticaMensual[mesKey] = {
        mesKey,
        kmTotales: 0,
        galonesTotales: 0,
        gastoTotalCop: 0,
        tanqueosCount: 0,
        dias: {}
      };
    }

    analiticaMensual[mesKey].kmTotales += t.distancia_km;
    analiticaMensual[mesKey].galonesTotales += t.galones;
    analiticaMensual[mesKey].gastoTotalCop += t.costo_total_cop;
    analiticaMensual[mesKey].tanqueosCount += 1;

    // Sub-agrupación por día
    if (!analiticaMensual[mesKey].dias[diaKey]) {
      analiticaMensual[mesKey].dias[diaKey] = {
        diaKey,
        kmTotales: 0,
        galonesTotales: 0,
        gastoTotalCop: 0,
        tanqueosCount: 0
      };
    }
    analiticaMensual[mesKey].dias[diaKey].kmTotales += t.distancia_km;
    analiticaMensual[mesKey].dias[diaKey].galonesTotales += t.galones;
    analiticaMensual[mesKey].dias[diaKey].gastoTotalCop += t.costo_total_cop;
    analiticaMensual[mesKey].dias[diaKey].tanqueosCount += 1;
  });

  const alertasTotales = vehiculosConEstado.filter(v => v.alertaAceite || v.alertaDocumentos).length;

  res.json({
    kpis: {
      totalGastoCop,
      totalGalones,
      totalKmRecorridos,
      rendimientoPromedio: totalGalones > 0 ? (totalKmRecorridos / totalGalones).toFixed(2) : 0,
      alertasActivas: alertasTotales
    },
    vehiculos: vehiculosConEstado,
    tanqueos,
    conductores: Object.values(analiticaConductores),
    mensual: analiticaMensual
  });
});

// POST: Registrar Vehículo
app.post('/api/v1/vehiculos', async (req, res) => {
  const { placa, conductor, kmActual, intervaloAceite, vencSoat, vencTecno } = req.body;
  await db.read();

  if (!placa || !conductor || !kmActual) {
    return res.status(400).json({ status: 'error', message: 'Campos principales obligatorios' });
  }

  const placaLimpia = placa.trim().toUpperCase();
  const existe = db.data.vehiculos.find(v => v.placa === placaLimpia);
  if (existe) {
    return res.status(400).json({ status: 'error', message: `El vehículo ${placaLimpia} ya existe.` });
  }

  const kmInicial = parseInt(kmActual);
  const intervalo = parseInt(intervaloAceite) || 5000;

  const nuevoVehiculo = {
    id: Date.now(),
    placa: placaLimpia,
    conductor: conductor.trim(),
    kmActual: kmInicial,
    proxAceiteKm: kmInicial + intervalo,
    vencSoat: vencSoat || '',
    vencTecno: vencTecno || ''
  };

  db.data.vehiculos.push(nuevoVehiculo);
  await db.write();

  res.status(201).json({
    status: 'success',
    message: `Vehículo ${placaLimpia} guardado.`,
    vehiculo: nuevoVehiculo
  });
});

// POST: Registrar Tanqueo
app.post('/api/v1/tanqueos', async (req, res) => {
  const { vehiculo_id, kilometraje_registro, galones, costo_total_cop } = req.body;
  await db.read();

  const vehiculo = db.data.vehiculos.find(v => v.id === parseInt(vehiculo_id));
  if (!vehiculo) return res.status(404).json({ status: 'error', message: 'Vehículo no encontrado' });

  const kmReg = parseInt(kilometraje_registro);
  if (kmReg <= vehiculo.kmActual) {
    return res.status(400).json({
      status: 'error',
      message: `El kilometraje (${kmReg} Km) debe ser mayor al actual (${vehiculo.kmActual} Km).`
    });
  }

  const distancia = kmReg - vehiculo.kmActual;
  const gal = parseFloat(galones);
  const costo = parseFloat(costo_total_cop);
  const kmPorGalon = (distancia / gal).toFixed(2);
  const costoPorKm = (costo / distancia).toFixed(2);

  vehiculo.kmActual = kmReg;

  const ahora = new Date();

  const nuevoTanqueo = {
    id: Date.now(),
    placa: vehiculo.placa,
    conductor: vehiculo.conductor,
    fecha: ahora.toLocaleString('es-CO'),
    fechaISO: ahora.toISOString(),
    km_anterior: vehiculo.kmActual - distancia,
    km_nuevo: kmReg,
    distancia_km: distancia,
    galones: gal,
    costo_total_cop: costo,
    rendimiento_km_gal: parseFloat(kmPorGalon),
    costo_por_km_cop: parseFloat(costoPorKm)
  };

  db.data.tanqueos.unshift(nuevoTanqueo);
  await db.write();

  res.status(201).json({
    status: 'success',
    message: `Tanqueo registrado para ${vehiculo.placa} (${vehiculo.conductor})`,
    datos: nuevoTanqueo
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));
