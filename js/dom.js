// Utilidades de DOM compartidas por los módulos de la página.
// Crear nodos con textContent (nunca innerHTML) mantiene seguro el render
// de datos externos: el texto jamás se interpreta como HTML.

export function crear(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) {
    elemento.className = clase;
  }
  if (texto !== undefined) {
    elemento.textContent = texto;
  }
  return elemento;
}
