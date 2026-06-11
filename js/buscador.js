// Buscador histórico: búsqueda local contra el índice completo de pilotos
// y escuderías; las peticiones de detalle van por id real de la API.
// Los datos vienen de un servidor externo: todo se pinta con createElement
// y textContent, nunca interpolando strings en innerHTML.

import {
  obtenerPiloto,
  obtenerEquiposDePiloto,
  obtenerEquipo,
  obtenerPilotosDeEquipo,
  obtenerTodosLosPilotos,
  obtenerTodosLosEquipos,
} from './api.js';

const formulario = document.querySelector('#form-buscador');
const campoTermino = document.querySelector('#termino');
const botonBuscar = formulario.querySelector('button[type="submit"]');
const zonaEstado = document.querySelector('#estado');
const zonaPrincipal = document.querySelector('#resultado-principal');
const zonaRelacionados = document.querySelector('#resultado-relacionados');

// "Sainz" a propósito: tiene dos coincidencias y muestra el selector
const EJEMPLOS_DE_BUSQUEDA = ['Alonso', 'Schumacher', 'Sainz'];

const formatoFecha = new Intl.DateTimeFormat('es', { dateStyle: 'long' });

// Qué relanzar si el usuario pulsa "Reintentar" tras un error
let reintentarBusqueda = null;

// Índices ya cargados en esta sesión, para diferenciar el estado de carga
const indicesCargados = new Set();

// --- Utilidades -------------------------------------------------------------

// Minúsculas y sin tildes: NFD separa cada letra acentuada en letra + marca
// diacrítica, y el replace borra esas marcas ("Pérez" → "perez")
function normalizarTexto(texto) {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function crear(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) {
    elemento.className = clase;
  }
  if (texto !== undefined) {
    elemento.textContent = texto;
  }
  return elemento;
}

// Parseo por partes: new Date("AAAA-MM-DD") interpreta la fecha como UTC
// y en zonas horarias negativas puede mostrar el día anterior
function parsearFechaISO(fechaIso) {
  const [anio, mes, dia] = fechaIso.split('-').map(Number);
  return new Date(anio, mes - 1, dia);
}

function calcularEdad(fechaNacimiento) {
  const hoy = new Date();
  const edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const noHaCumplidoEsteAnio =
    hoy.getMonth() < fechaNacimiento.getMonth() ||
    (hoy.getMonth() === fechaNacimiento.getMonth() && hoy.getDate() < fechaNacimiento.getDate());
  return noHaCumplidoEsteAnio ? edad - 1 : edad;
}

function limpiarZonas() {
  zonaEstado.replaceChildren();
  zonaPrincipal.replaceChildren();
  zonaRelacionados.replaceChildren();
}

// --- Búsqueda local en el índice ----------------------------------------------

// Comparar contra el nombre completo normalizado cubre también las
// coincidencias parciales en givenName y familyName por separado
async function buscarCandidatos(texto, tipo) {
  const termino = normalizarTexto(texto);

  if (tipo === 'piloto') {
    const pilotos = await obtenerTodosLosPilotos();
    return pilotos.filter((piloto) =>
      normalizarTexto(`${piloto.givenName} ${piloto.familyName}`).includes(termino),
    );
  }

  const equipos = await obtenerTodosLosEquipos();
  return equipos.filter((equipo) => normalizarTexto(equipo.name).includes(termino));
}

// --- Flujos de búsqueda ---------------------------------------------------------

// Envoltura común: guarda contra el doble disparo, limpia, deshabilita el
// botón mientras dura y convierte cualquier excepción en el estado de error
async function conEstadoDeCarga(tarea) {
  if (botonBuscar.disabled) {
    return;
  }

  limpiarZonas();
  botonBuscar.disabled = true;
  try {
    await tarea();
  } catch (error) {
    mostrarError(error);
  } finally {
    botonBuscar.disabled = false;
  }
}

function buscar(texto, tipo) {
  reintentarBusqueda = () => buscar(texto, tipo);

  conEstadoDeCarga(async () => {
    // La primera vez por tipo hay que bajar el índice: estado diferenciado
    zonaEstado.textContent = indicesCargados.has(tipo)
      ? 'Buscando...'
      : `Preparando índice de ${tipo === 'piloto' ? 'pilotos' : 'escuderías'}...`;

    const candidatos = await buscarCandidatos(texto, tipo);
    indicesCargados.add(tipo);

    if (candidatos.length === 0) {
      mostrarSinResultado(texto);
      return;
    }

    if (candidatos.length === 1) {
      zonaEstado.textContent = 'Buscando...';
      await mostrarResultados(idDelCandidato(candidatos[0], tipo), tipo);
      zonaEstado.replaceChildren();
      return;
    }

    zonaEstado.replaceChildren();
    pintarCandidatos(candidatos, tipo);
  });
}

// Búsqueda con id exacto: la usan los chips y la selección de candidatos
function buscarExacta(id, tipo) {
  reintentarBusqueda = () => buscarExacta(id, tipo);

  conEstadoDeCarga(async () => {
    zonaEstado.textContent = 'Buscando...';
    await mostrarResultados(id, tipo);
    zonaEstado.replaceChildren();
  });
}

function idDelCandidato(candidato, tipo) {
  return tipo === 'piloto' ? candidato.driverId : candidato.constructorId;
}

async function mostrarResultados(id, tipo) {
  if (tipo === 'piloto') {
    const [piloto, equipos] = await Promise.all([
      obtenerPiloto(id),
      obtenerEquiposDePiloto(id),
    ]);

    pintarPiloto(piloto);
    pintarRelacionados({
      titulo: 'Escuderías en su carrera',
      chips: equipos.map((equipo) => ({
        id: equipo.constructorId,
        tipo: 'escuderia',
        nombre: equipo.name,
        nacionalidad: equipo.nationality,
      })),
    });
    return;
  }

  const [equipo, pilotos] = await Promise.all([
    obtenerEquipo(id),
    obtenerPilotosDeEquipo(id),
  ]);

  pintarEquipo(equipo);
  pintarRelacionados({
    titulo: 'Pilotos en su historia',
    conteo: `${pilotos.length} pilotos han corrido por ${equipo.name}`,
    chips: pilotos.map((piloto) => ({
      id: piloto.driverId,
      tipo: 'piloto',
      nombre: `${piloto.givenName} ${piloto.familyName}`,
      nacionalidad: piloto.nationality,
    })),
  });
}

// --- Render: resultado principal ----------------------------------------------

function pintarPiloto(piloto) {
  const ficha = crear('article', 'ficha');
  const cabecera = crear('header', 'ficha-cabecera');
  cabecera.append(crear('h2', null, `${piloto.givenName} ${piloto.familyName}`));

  // Los pilotos históricos no siempre tienen número permanente ni código
  if (piloto.permanentNumber) {
    cabecera.append(crear('span', 'badge badge-dato', `Nº ${piloto.permanentNumber}`));
  }
  if (piloto.code) {
    cabecera.append(crear('span', 'badge badge-dato', piloto.code));
  }
  ficha.append(cabecera);

  const datos = crear('dl', 'ficha-datos');
  agregarDato(datos, 'Nacionalidad', piloto.nationality);
  if (piloto.dateOfBirth) {
    const nacimiento = parsearFechaISO(piloto.dateOfBirth);
    const fechaConEdad = `${formatoFecha.format(nacimiento)} (${calcularEdad(nacimiento)} años)`;
    agregarDato(datos, 'Nacimiento', fechaConEdad);
  }
  ficha.append(datos);

  zonaPrincipal.append(ficha);
}

function pintarEquipo(equipo) {
  const ficha = crear('article', 'ficha');
  const cabecera = crear('header', 'ficha-cabecera');
  cabecera.append(crear('h2', null, equipo.name));
  ficha.append(cabecera);

  const datos = crear('dl', 'ficha-datos');
  agregarDato(datos, 'Nacionalidad', equipo.nationality);
  ficha.append(datos);

  zonaPrincipal.append(ficha);
}

function agregarDato(lista, termino, valor) {
  if (!valor) {
    return;
  }
  lista.append(crear('dt', null, termino), crear('dd', null, valor));
}

// --- Render: chips (candidatos y relacionados) ----------------------------------

function crearChip(datos) {
  const boton = crear('button', 'chip');
  boton.type = 'button';
  boton.dataset.buscarId = datos.id;
  boton.dataset.buscarTipo = datos.tipo;
  boton.dataset.nombre = datos.nombre;
  boton.append(
    crear('span', 'chip-nombre', datos.nombre),
    crear('span', 'chip-nacionalidad', datos.nacionalidad ?? ''),
  );

  const item = crear('li');
  item.append(boton);
  return item;
}

function pintarCandidatos(candidatos, tipo) {
  zonaPrincipal.append(crear('h2', null, '¿Cuál buscabas?'));

  const lista = crear('ul', 'grid-chips');
  candidatos.forEach((candidato) => {
    lista.append(
      crearChip({
        id: idDelCandidato(candidato, tipo),
        tipo,
        nombre:
          tipo === 'piloto' ? `${candidato.givenName} ${candidato.familyName}` : candidato.name,
        nacionalidad: candidato.nationality,
      }),
    );
  });
  zonaPrincipal.append(lista);
}

function pintarRelacionados({ titulo, conteo, chips }) {
  zonaRelacionados.append(crear('h2', null, titulo));
  if (conteo) {
    zonaRelacionados.append(crear('p', 'conteo', conteo));
  }

  const lista = crear('ul', 'grid-chips');
  chips.forEach((datos) => lista.append(crearChip(datos)));
  zonaRelacionados.append(lista);
}

// --- Render: estados de error ----------------------------------------------------

function mostrarSinResultado(texto) {
  zonaEstado.replaceChildren();

  const mensaje = crear(
    'p',
    null,
    `No encontramos «${texto}». Revisa la escritura o prueba con un apellido: `,
  );
  EJEMPLOS_DE_BUSQUEDA.forEach((ejemplo, indice) => {
    const boton = crear('button', 'ejemplo', ejemplo);
    boton.type = 'button';
    boton.dataset.ejemplo = ejemplo;
    mensaje.append(boton);
    if (indice < EJEMPLOS_DE_BUSQUEDA.length - 1) {
      mensaje.append(', ');
    }
  });

  zonaEstado.append(mensaje);
}

function mostrarError(error) {
  zonaEstado.replaceChildren(crear('p', null, error.message));

  const boton = crear('button', 'reintentar', 'Reintentar');
  boton.type = 'button';
  boton.dataset.reintentar = '';
  zonaEstado.append(boton);
}

// --- Eventos ----------------------------------------------------------------------

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  const texto = campoTermino.value.trim();
  if (!texto) {
    return;
  }
  buscar(texto, formulario.elements.tipo.value);
});

// Delegación: los botones de ejemplo y "Reintentar" se crean dinámicamente
zonaEstado.addEventListener('click', (evento) => {
  const botonEjemplo = evento.target.closest('[data-ejemplo]');
  if (botonEjemplo) {
    campoTermino.value = botonEjemplo.dataset.ejemplo;
    document.querySelector('#tipo-piloto').checked = true;
    buscar(botonEjemplo.dataset.ejemplo, 'piloto');
    return;
  }

  if (evento.target.closest('[data-reintentar]') && reintentarBusqueda) {
    reintentarBusqueda();
  }
});

// Delegación: cualquier chip (candidato o relacionado) lanza la búsqueda
// exacta por id, sin volver a pasar por el filtro de texto
function alClickarChip(evento) {
  const chip = evento.target.closest('[data-buscar-id]');
  if (!chip) {
    return;
  }

  campoTermino.value = chip.dataset.nombre;
  const radio = chip.dataset.buscarTipo === 'piloto' ? '#tipo-piloto' : '#tipo-escuderia';
  document.querySelector(radio).checked = true;
  buscarExacta(chip.dataset.buscarId, chip.dataset.buscarTipo);
}

zonaPrincipal.addEventListener('click', alClickarChip);
zonaRelacionados.addEventListener('click', alClickarChip);
