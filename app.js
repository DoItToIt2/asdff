const request = require('request');
const cheerio = require('cheerio');
const express = require('express');

// Iniciar el servidor Express
const app = express();
const PORT = 3000;

// Middleware para manejar solicitudes JSON
app.use(express.json());

// ruta inicial para verificar que el servidor está funcionando
app.get('/', (req, res) => {
  res.send('Servidor funcionando!');
});

// Ruta para obtener los datos de la página web
app.get('/scrape', (req, res) => {
  if (req.body.documento === undefined) {
    return res.status(400).json({ error: 'El campo documento es requerido' });
  }
  request.get('https://reportes.sisben.gov.co/dnp_sisbenconsulta', (err, response, body) => {
    if (err) {
      return res.status(500).json({ error: 'Error en GET: ' + err.message });
    }
    const cookie = response.headers['set-cookie'][0];
    const tokenMatch = body.match(/<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]+)"/);
    if (!tokenMatch) {
      return res.status(500).json({ error: 'Token no encontrado' });
    }
    const token = tokenMatch[1];

    request.post({
      url: 'https://reportes.sisben.gov.co/dnp_sisbenconsulta',
      headers: { cookie },
      form: {
        'TipoID': '3',
        'documento': req.body.documento,
        '__RequestVerificationToken': token
      }
    }, (err, response, body) => {
      if (err) {
        return res.status(500).json({ error: 'Error en POST: ' + err.message });
      }
      const $ = cheerio.load(body);
      let nombres = $('p.etiqueta1:contains("Nombres:")')
        .next('p.campo1').text().trim();
      let apellidos = $('p.etiqueta1:contains("Apellidos:")')
        .next('p.campo1').text();

      nombres = nombres.replace(/\s+/g, ' ');
      apellidos = apellidos.replace(/\s+/g, ' ');

      res.json({
        nombres: nombres,
        apellidos: apellidos,
        nombreCompleto: nombres + apellidos
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
