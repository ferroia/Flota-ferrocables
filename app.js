async function cargarFlota() {
  try {
    const res = await fetch('/api/v1/flota/dashboard');
    const data = await res.json();

    const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(data.gastoTotalCOP || 0);
    document.getElementById('kpi-gasto').textContent = formatoCOP;
    document.getElementById('kpi-recorrido').textContent = `${data.recorridoAcumuladoKm || 0} Km`;
    document.getElementById('kpi-rendimiento').textContent = `${data.rendimientoPromedio || 0} Km/Gal`;

    renderTablaTanqueos(data.tanqueos || []);
  } catch (err) {
    console.error('Error cargando flota:', err);
  }
}

function renderTablaTanqueos(lista) {
  const tbody = document.getElementById('tabla-tanqueos');
  if (!tbody) return;

  if (lista.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No hay tanqueos registrados.</td></tr>';
    return;
  }

  let html = '';
  lista.slice().reverse().forEach(t => {
    const costo = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(t.costoCOP || 0);
    html += `
      <tr>
        <td style="font-weight:800; text-transform:uppercase;">${t.placa}</td>
        <td>${t.fecha}</td>
        <td>${t.galones} Gal</td>
        <td style="font-weight:700; color:#059669;">${costo}</td>
        <td>${t.kilometraje} Km</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function abrirModalTanqueo() {
  document.getElementById('modal-tanqueo').classList.remove('hidden');
}

function cerrarModales() {
  document.getElementById('modal-tanqueo').classList.add('hidden');
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

  await fetch('/api/v1/flota/tanqueos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  cerrarModales();
  cargarFlota();
});

cargarFlota();
