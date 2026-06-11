// Históricos por temporada: select de años y tabla de standings del campeonato.

import { obtenerStandings } from './api.js';
import { crear } from './dom.js';

const ANIO_PRIMERA_TEMPORADA = 1950;
const ANIO_ACTUAL = new Date().getFullYear();

const selectorAnio = document.querySelector('#selector-anio');
const zonaEstado = document.querySelector('#estado-historico');
const zonaTabla = document.querySelector('#tabla-historico');

// --- Select de temporadas -----------------------------------------------------

// Descendente: el año actual queda primero y por tanto preseleccionado
function generarOpciones() {
  for (let anio = ANIO_ACTUAL; anio >= ANIO_PRIMERA_TEMPORADA; anio -= 1) {
    const opcion = crear('option', null, String(anio));
    opcion.value = String(anio);
    selectorAnio.append(opcion);
  }
}

// --- Carga y render -------------------------------------------------------------

async function cargarTemporada(anio) {
  zonaTabla.replaceChildren();
  zonaEstado.textContent = `Cargando temporada ${anio}...`;
  selectorAnio.disabled = true;

  try {
    const standings = await obtenerStandings(anio);
    zonaEstado.replaceChildren();

    if (standings.length === 0) {
      zonaEstado.textContent = `Aún no hay clasificación para ${anio}.`;
      return;
    }

    zonaTabla.append(crearTabla(anio, standings));
    if (Number(anio) === ANIO_ACTUAL) {
      zonaTabla.append(crear('p', 'nota-datos', 'Temporada en curso: clasificación parcial.'));
    }
  } catch (error) {
    mostrarError(error);
  } finally {
    selectorAnio.disabled = false;
  }
}

function crearTabla(anio, standings) {
  const envoltorio = crear('div', 'tabla-wrapper');
  envoltorio.setAttribute('role', 'region');
  envoltorio.setAttribute('aria-labelledby', 'caption-historico');
  envoltorio.tabIndex = 0;

  const tabla = crear('table');

  const titulo = crear('caption', null, `Campeonato de Pilotos ${anio}`);
  titulo.id = 'caption-historico';
  tabla.append(titulo);

  const cabecera = crear('thead');
  const filaCabecera = crear('tr');
  ['Pos', 'Piloto', 'Escudería', 'Puntos', 'Victorias'].forEach((etiqueta) => {
    const celda = crear('th', null, etiqueta);
    celda.scope = 'col';
    filaCabecera.append(celda);
  });
  cabecera.append(filaCabecera);
  tabla.append(cabecera);

  const cuerpo = crear('tbody');
  standings.forEach((standing, indice) => {
    cuerpo.append(crearFila(standing, indice === 0));
  });
  tabla.append(cuerpo);

  envoltorio.append(tabla);
  return envoltorio;
}

function crearFila(standing, esCampeon) {
  // La primera fila es el campeón (o líder, si la temporada está en curso)
  const fila = crear('tr', esCampeon ? 'lider' : null);

  const celdaPiloto = crear(
    'th',
    null,
    `${standing.Driver.givenName} ${standing.Driver.familyName}`,
  );
  celdaPiloto.scope = 'row';

  // Constructors es un array: un piloto pudo correr por varios equipos ese año
  const escuderias = standing.Constructors.map((equipo) => equipo.name).join(' / ');

  fila.append(
    crear('td', 'num', standing.position),
    celdaPiloto,
    crear('td', null, escuderias),
    crear('td', 'num', standing.points),
    crear('td', 'num', standing.wins),
  );
  return fila;
}

// --- Errores ----------------------------------------------------------------------

function mostrarError(error) {
  zonaEstado.replaceChildren(crear('p', null, error.message));

  const boton = crear('button', 'reintentar', 'Reintentar');
  boton.type = 'button';
  boton.dataset.reintentar = '';
  zonaEstado.append(boton);
}

// --- Eventos y arranque --------------------------------------------------------------

selectorAnio.addEventListener('change', () => cargarTemporada(selectorAnio.value));

zonaEstado.addEventListener('click', (evento) => {
  if (evento.target.closest('[data-reintentar]')) {
    cargarTemporada(selectorAnio.value);
  }
});

generarOpciones();
cargarTemporada(selectorAnio.value);
