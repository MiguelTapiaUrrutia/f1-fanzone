// Buscador histórico — fase 2.
// Por ahora: prueba de humo de la capa de API (resultado por consola).

import { obtenerPiloto } from './api.js';

const formulario = document.querySelector('#form-buscador');
const campoTermino = document.querySelector('#termino');
const zonaEstado = document.querySelector('#estado');

async function alEnviarBusqueda(evento) {
  evento.preventDefault();

  const termino = campoTermino.value.trim().toLowerCase();
  if (!termino) {
    return;
  }

  zonaEstado.textContent = 'Buscando...';

  try {
    const piloto = await obtenerPiloto(termino);
    console.log('Prueba de humo — obtenerPiloto:', piloto);
    zonaEstado.textContent = '';
  } catch (error) {
    zonaEstado.textContent = error.message;
  }
}

formulario.addEventListener('submit', alEnviarBusqueda);
