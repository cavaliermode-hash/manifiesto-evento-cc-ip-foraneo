# Manifiesto Evento CC IP Foráneo

- `index.html`: manifiesto de salidas. Calcula el pick up de cada pasajero como la hora de salida de su vuelo de regreso menos 3 horas (constante `HORAS_ANTES`) y los agrupa por horario, con vista de tabla, impresión y copia a Excel.
- `data.json`: los datos. Es lo único que cambia al actualizar.
- `actualizar.html`: convierte el reporte de Excel (hoja "Concentrado de vuelos") en un `data.json` nuevo. Teléfonos, correos, fechas de nacimiento, costos y PNR se descartan.

Para actualizar: abre `/actualizar.html`, elige el Excel, descarga el `data.json` y súbelo aquí con **Add file → Upload files**. No subas el Excel: el repositorio es público.
