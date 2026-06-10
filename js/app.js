// Interacciones de la landing: menú móvil y resaltado de sección activa

const CLASE_NAV_ABIERTO = 'nav-abierto';
const CLASE_ENLACE_ACTIVO = 'activo';

const encabezado = document.querySelector('header');
const botonMenu = document.querySelector('.menu-boton');
const enlacesNav = document.querySelectorAll('nav ul a');
const secciones = document.querySelectorAll('main section[id]');

// --- Menú móvil ---------------------------------------------------------

function actualizarBotonMenu(estaAbierto) {
  botonMenu.setAttribute('aria-expanded', String(estaAbierto));
  botonMenu.setAttribute('aria-label', estaAbierto ? 'Cerrar menú' : 'Abrir menú');
}

function alternarMenu() {
  const estaAbierto = encabezado.classList.toggle(CLASE_NAV_ABIERTO);
  actualizarBotonMenu(estaAbierto);
}

function cerrarMenu() {
  encabezado.classList.remove(CLASE_NAV_ABIERTO);
  actualizarBotonMenu(false);
}

function iniciarMenu() {
  botonMenu.addEventListener('click', alternarMenu);
  enlacesNav.forEach((enlace) => enlace.addEventListener('click', cerrarMenu));
}

// --- Sección activa en el nav -------------------------------------------

function resaltarEnlace(idSeccion) {
  enlacesNav.forEach((enlace) => {
    const apuntaALaSeccion = enlace.getAttribute('href') === `#${idSeccion}`;
    enlace.classList.toggle(CLASE_ENLACE_ACTIVO, apuntaALaSeccion);
  });
}

function alIntersectar(entradas) {
  entradas.forEach((entrada) => {
    if (entrada.isIntersecting) {
      resaltarEnlace(entrada.target.id);
    }
  });
}

function iniciarObservadorDeSecciones() {
  // Franja de detección: una sección es "activa" cuando cruza
  // la zona entre el 40% y el 45% superior del viewport
  const observador = new IntersectionObserver(alIntersectar, {
    rootMargin: '-40% 0px -55% 0px',
  });

  secciones.forEach((seccion) => observador.observe(seccion));
}

// --- Arranque -------------------------------------------------------------

if (encabezado && botonMenu) {
  iniciarMenu();
}

if (secciones.length > 0) {
  iniciarObservadorDeSecciones();
}
