# F1 FanZone

Landing fan de Fórmula 1 con datos curados de la temporada 2026: clasificaciones, calendario, escuderías e historia. Es la **fase 1** de un proyecto que en su fase 2 integrará una API de datos históricos de F1.

**🔗 Sitio en vivo: [migueltapiaurrutia.github.io/f1-fanzone](https://migueltapiaurrutia.github.io/f1-fanzone/)**

## Secciones

- **Hero** — Presentación con CTA hacia el campeonato.
- **Campeonato** — Tablas de pilotos y constructores tras el GP de Mónaco 2026.
- **Calendario** — Tarjetas de las próximas seis carreras, con badges de próxima cita y formato Sprint.
- **Escuderías** — Los 11 equipos de la parrilla 2026 con alineaciones, motor y color identificativo.
- **Historia** — Línea de tiempo con cinco hitos, de Silverstone 1950 a la nueva era 2026.

## Tecnologías

- **HTML5 semántico** — `section`, `article`, `time`, tablas con `caption` y `scope`.
- **CSS3** — Grid, Flexbox, custom properties, `clamp()` para tipografía fluida.
- **JavaScript vanilla** — IntersectionObserver y manipulación de clases; sin dependencias.

## Decisiones técnicas

- Mobile-first con Grid `auto-fit` para layouts responsive sin media queries innecesarias.
- Tablas semánticas con `caption` y `scope` para accesibilidad real con lectores de pantalla.
- Menú móvil con patrón estado-como-clase: JS conmuta la clase, CSS anima.
- `aria-expanded`, `focus-visible` y `scroll-padding-top` como base de accesibilidad e interacción.
- Datos curados con fecha de actualización declarada, como paso previo a la integración de API.
- Sitio fan sin marcas ni recursos oficiales, por respeto a la propiedad intelectual.

## Roadmap

- **Fase 2 — API de datos históricos**: buscador de pilotos y equipos con cruce de datos, y consulta de históricos por temporada.

## Ejecutar localmente

```bash
git clone git@github.com:MiguelTapiaUrrutia/f1-fanzone.git
cd f1-fanzone
# Abrir index.html en el navegador, o servirlo con:
npx serve .
```

## Estado

✅ Fase 1 completada

## Aviso

Sitio fan no oficial. Sin afiliación con Formula 1, FIA ni equipos.
