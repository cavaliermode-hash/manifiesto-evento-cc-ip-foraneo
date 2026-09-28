# Manifiesto Evento CC IP Foráneo

- `index.html`: buscador de vuelos (ida, regreso, conexiones y clave de reserva).
- `data.json`: los datos. Es lo único que cambia al actualizar.
- `actualizar.html`: convierte el reporte de Excel (hoja "Concentrado de vuelos") en un `data.json` nuevo. Teléfonos, correos, fechas de nacimiento, costos y PNR se descartan.

Para actualizar: abre `/actualizar.html`, elige el Excel, descarga el `data.json` y súbelo aquí con **Add file → Upload files**. No subas el Excel: el repositorio es público.
