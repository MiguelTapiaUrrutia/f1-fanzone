// Capa de acceso a la API Jolpica (espejo moderno de Ergast).
// Todo el conocimiento sobre la forma de la API (MRData, tablas, paginación)
// vive aquí; el resto de la app solo recibe pilotos, constructores y standings.

const BASE_URL = 'https://api.jolpi.ca/ergast/f1';

// La API permite pedir hasta 100 resultados por página
const LIMITE_POR_PAGINA = 100;

// Caché en memoria: ruta → JSON ya parseado. Vive mientras viva la página.
const cache = new Map();

// --- Función central -------------------------------------------------------

async function obtenerJSON(ruta) {
  if (cache.has(ruta)) {
    return cache.get(ruta);
  }

  let respuesta;
  try {
    respuesta = await fetch(`${BASE_URL}${ruta}`);
  } catch {
    // fetch solo rechaza por fallos de red (sin conexión, DNS, CORS),
    // nunca por códigos HTTP de error
    throw new Error('No se pudo conectar con la API. Revisa tu conexión a internet.');
  }

  if (!respuesta.ok) {
    const error = new Error(`La API respondió con error ${respuesta.status} (${respuesta.statusText}) en ${ruta}`);
    error.status = respuesta.status;
    throw error;
  }

  const datos = await respuesta.json();
  cache.set(ruta, datos);
  return datos;
}

// --- Helpers internos ------------------------------------------------------

// Un id inexistente puede llegar como 404 o como tabla vacía según el endpoint;
// este helper convierte ambos casos en null
async function obtenerPrimeroONull(ruta, extraerLista) {
  try {
    const datos = await obtenerJSON(ruta);
    return extraerLista(datos.MRData)[0] ?? null;
  } catch (error) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

// Recorre todas las páginas de un recurso listado y devuelve la lista completa
async function obtenerListaCompleta(construirRuta, extraerLista) {
  const primeraPagina = await obtenerJSON(construirRuta(0));
  const total = Number(primeraPagina.MRData.total);
  const elementos = [...extraerLista(primeraPagina.MRData)];

  // Si total > limit, la primera página no trae todo: pedimos el resto
  // avanzando el offset de página en página hasta alcanzar el total
  for (let offset = LIMITE_POR_PAGINA; offset < total; offset += LIMITE_POR_PAGINA) {
    const pagina = await obtenerJSON(construirRuta(offset));
    elementos.push(...extraerLista(pagina.MRData));
  }

  return elementos;
}

// --- Índices completos con caché persistente --------------------------------
// Los listados completos (~860 pilotos, ~210 equipos) cambian muy poco:
// se guardan en localStorage con marca de tiempo y se reutilizan 30 días.

const CLAVE_INDICE_PILOTOS = 'f1fanzone-indice-pilotos';
const CLAVE_INDICE_EQUIPOS = 'f1fanzone-indice-equipos';
const VIGENCIA_INDICE_MS = 30 * 24 * 60 * 60 * 1000; // 30 días

function leerIndiceLocal(clave) {
  try {
    const crudo = localStorage.getItem(clave);
    if (!crudo) {
      return null;
    }

    const { timestamp, datos } = JSON.parse(crudo);
    const estaVencido = Date.now() - timestamp > VIGENCIA_INDICE_MS;
    if (estaVencido || !Array.isArray(datos)) {
      return null;
    }
    return datos;
  } catch {
    // JSON corrupto o localStorage inaccesible: como si no hubiera caché
    return null;
  }
}

function guardarIndiceLocal(clave, datos) {
  try {
    localStorage.setItem(clave, JSON.stringify({ timestamp: Date.now(), datos }));
  } catch {
    // localStorage lleno o bloqueado: la app funciona igual, solo que la
    // próxima sesión volverá a descargar el índice
  }
}

async function obtenerIndice(clave, recurso, extraerLista) {
  const guardado = leerIndiceLocal(clave);
  if (guardado) {
    return guardado;
  }

  const datos = await obtenerListaCompleta(
    (offset) => `${recurso}?limit=${LIMITE_POR_PAGINA}&offset=${offset}`,
    extraerLista,
  );
  guardarIndiceLocal(clave, datos);
  return datos;
}

// --- API pública -----------------------------------------------------------

export function obtenerTodosLosPilotos() {
  return obtenerIndice(CLAVE_INDICE_PILOTOS, '/drivers.json', (mrData) => mrData.DriverTable.Drivers);
}

export function obtenerTodosLosEquipos() {
  return obtenerIndice(CLAVE_INDICE_EQUIPOS, '/constructors.json', (mrData) => mrData.ConstructorTable.Constructors);
}

export async function obtenerPiloto(driverId) {
  const id = encodeURIComponent(driverId);
  return obtenerPrimeroONull(`/drivers/${id}.json`, (mrData) => mrData.DriverTable.Drivers);
}

export async function obtenerEquiposDePiloto(driverId) {
  const id = encodeURIComponent(driverId);
  const datos = await obtenerJSON(`/drivers/${id}/constructors.json?limit=${LIMITE_POR_PAGINA}`);
  return datos.MRData.ConstructorTable.Constructors;
}

export async function obtenerEquipo(constructorId) {
  const id = encodeURIComponent(constructorId);
  return obtenerPrimeroONull(`/constructors/${id}.json`, (mrData) => mrData.ConstructorTable.Constructors);
}

export async function obtenerPilotosDeEquipo(constructorId) {
  const id = encodeURIComponent(constructorId);
  return obtenerListaCompleta(
    (offset) => `/constructors/${id}/drivers.json?limit=${LIMITE_POR_PAGINA}&offset=${offset}`,
    (mrData) => mrData.DriverTable.Drivers,
  );
}

export async function obtenerStandings(anio) {
  const datos = await obtenerJSON(`/${encodeURIComponent(anio)}/driverstandings.json?limit=${LIMITE_POR_PAGINA}`);
  return datos.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
}
