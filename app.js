let chartGastosInstance = null;
let chartRecorridoInstance = null;
let chartRendimientoInstance = null;

async function cargarFlota() {
  try {
    const res = await fetch('/api/v1/flota/dashboard');
    const data = await res.json();

    const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.gastoTotalCOP || 0);
    document.getElementById('kpi-gasto').textContent = formatoCOP;
    document.getElementById('kpi-recorrido').textContent = `${data.recorridoAcumuladoKm || 0} Km`;
    document.getElementById('kpi-rendimiento').textContent = `${data.rendimientoPromedio || 0} Km/Gal`;

    renderTablaTanqueos(data.tanqueos || []);
    renderTablaMantenimientos(data.mantenimientos || []);
    renderTablaVehiculos(data.vehiculos || []);
    renderGraficas(data.reportesMensuales || []);
  } catch (err) {
    console.error('Error cargando datos de la flota:', err);
  }
}

function renderGraficas(reportes) {
  const labels = reportes.length > 0 ? reportes.map(r => r.mes) : ['Sin Datos'];
  const gastosComb = reportes.length > 0 ? reportes.map(r => r.gastoCombustible) : [0];
  const gastosMaint = reportes.length > 0 ? reportes.map(r => r.gastoMaint) : [0];
  const kms = reportes.length > 0 ? reportes.map(r => r.kmRecorridos) : [0];
  const rendimiento = reportes.length > 0 ? reportes.map(r => r.rendimientoKmGal) : [0];

  // 1. Gráfica de Gastos Mes a Mes
  const ctxGastos = document.getElementById('chart-gastos').getContext('2d');
  if (chartGastosInstance) chartGastosInstance.destroy();
  chartGastosInstance = new Chart(ctxGastos, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Combustible', data: gastosComb, backgroundColor: '#2563eb' },
        { label: 'Mantenimiento', data: gastosMaint, backgroundColor: '#f59e0b' }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
      }
    }
  });

  // 2. Gráfica de Recorrido por Mes
  const ctxRecorrido = document.getElementById('chart-recorrido').getContext('2d');
  if (chartRecorridoInstance) chartRecorridoInstance.destroy();
  chartRecorridoInstance = new Chart(ctxRecorrido, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Kilómetros (Km)',
        data: kms,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
      }
    }
  });

  // 3. Gráfica de Consumo Promedio (Km/Gal)
  const ctxRendimiento = document.getElementById('chart-rendimiento').getContext('2d');
  if (chartRendimientoInstance) chartRendimientoInstance.destroy();
  chartRendimientoInstance = new Chart(ctxRendimiento, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Eficiencia (Km/Gal)',
        data: rendimiento,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color: '#cbd5e1' } } },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
      }
    }
  });
}

function renderTablaTanqueos(lista) {
  const tbody = document.getElementById('tabla-tanqueos');
  if (!tbody) return;
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">No hay tanqueos registrados.</td></tr>';
    return;
  }
  let html = '';
  lista.slice().reverse().forEach(t => {
    const costo = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(t.costoCOP || 0);
    html += `
      <tr>
        <td style="font-weight:800; color:#f8fafc; text-transform:uppercase;">${t.placa}</td>
        <td>${t.fecha}</td>
        <td>${t.galones} Gal</td>
        <td style="font-weight:700; color:#34d399;">${costo}</td>
        <td>${t.kilometraje} Km</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderTablaMantenimientos(lista) {
  const tbody = document.getElementById('tabla-maint');
  if (!tbody) return;
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#64748b;">No hay mantenimientos ni cambios de aceite registrados.</td></tr>';
    return;
  }
  let html = '';
  lista.slice().reverse().forEach(m => {
    const costo = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(m.costoCOP || 0);
    html += `
      <tr>
        <td style="font-weight:800; color:#f8fafc; text-transform:uppercase;">${m.placa}</td>
        <td>${m.fecha || 'N/A'}</td>
        <td><span style="background:#1e293b; padding:2px 8px; border-radius:6px; color:#fbbf24; font-size:0.7rem;">${m.tipo}</span></td>
        <td>${m.descripcion}</td>
        <td style="font-weight:700; color:#f87171;">${costo}</td>
        <td>${m.proximoKm ? m.proximoKm + ' Km' : 'N/A'}</td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function renderTablaVehiculos(lista) {
  const tbody = document.getElementById('tabla-vehiculos');
  if (!tbody) return;
  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#64748b;">No hay vehículos ni documentos registrados.</td></tr>';
    return;
  }
  let html = '';
  lista.forEach(v => {
    html += `
      <tr>
        <td style="font-weight:800; color:#f8fafc; text-transform:uppercase;">${v.placa}</td>
        <td>${v.modelo}</td>
        <td>${v.soat || 'Pendiente'}</td>
        <td>${v.tecno || 'Pendiente'}</td>
        <td><span style="background:#064e3b; color:#34d399; padding:2px 8px; border-radius:6px; font-size:0.7rem;">Al Día</span></td>
      </tr>
    `;
  });
  tbody.innerHTML = html;
}

function cambiarTab(tab) {
  ['tanqueos', 'maint', 'docs'].forEach(t => {
    document.getElementById(`sec-${t}`).classList.add('hidden');
    document.getElementById(`btn-tab-${t}`).classList.remove('active');
  });
  document.getElementById(`sec-${tab}`).classList.remove('hidden');
  document.getElementById(`btn-tab-${tab}`).classList.add('active');
}

function abrirModalTanqueo() { document.getElementById('modal-tanqueo').classList.remove('hidden'); }
function abrirModalMaint() { document.getElementById('modal-maint').classList.remove('hidden'); }
function abrirModalVehiculo() { document.getElementById('modal-vehiculo').classList.remove('hidden'); }
function cerrarModales() {
  document.getElementById('modal-tanqueo').classList.add('hidden');
  document.getElementById('modal-maint').classList.add('hidden');
  document.getElementById('modal-vehiculo').classList.add('hidden');
}

document.getElementById('form-tanqueo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    placa: document.getElementById('inp-placa').value.toUpperCase(),
    fecha: document.getElementById('inp-fecha-t').value,
    galones: Number(document.getElementById('inp-galones').value),
    costoCOP: Number(document.getElementById('inp-costo').value),
    kilometraje: Number(document.getElementById('inp-km').value)
  };
  await fetch('/api/v1/flota/tanqueos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  cerrarModales();
  cargarFlota();
});

document.getElementById('form-maint').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    placa: document.getElementById('inp-m-placa').value.toUpperCase(),
    tipo: document.getElementById('inp-m-tipo').value,
    descripcion: document.getElementById('inp-m-desc').value,
    costoCOP: Number(document.getElementById('inp-m-costo').value),
    proximoKm: Number(document.getElementById('inp-m-proxtkm').value) || null,
    fecha: new Date().toISOString().split('T')[0]
  };
  await fetch('/api/v1/flota/mantenimientos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  cerrarModales();
  cargarFlota();
});

document.getElementById('form-vehiculo').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    placa: document.getElementById('inp-v-placa').value.toUpperCase(),
    modelo: document.getElementById('inp-v-modelo').value,
    soat: document.getElementById('inp-v-soat').value,
    tecno: document.getElementById('inp-v-tecno').value
  };
  await fetch('/api/v1/flota/vehiculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  cerrarModales();
  cargarFlota();
});

cargarFlota();
