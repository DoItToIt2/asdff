const axios = require('axios');
const cheerio = require('cheerio');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config();
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const app = express();

// Middleware para manejar solicitudes JSON
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor funcionando!');
});

// Middleware para manejar CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));


// Ruta para obtener y segmentar los datos de la página web usando axios
app.post('/scrape', async (req, res) => {
  try {
    const { documento } = req.body;
    if (!documento) {
      return res.status(400).json({ error: 'El campo documento es requerido' });
    }

    // Solicitud GET inicial para obtener la cookie y el token de verificación
    const getResponse = await axios.get('https://reportes.sisben.gov.co/dnp_sisbenconsulta');
    const cookie = getResponse.headers['set-cookie'] ? getResponse.headers['set-cookie'][0] : null;
    if (!cookie) {
      return res.status(500).json({ error: 'Cookie no encontrada' });
    }
    const body = getResponse.data;
    const tokenMatch = body.match(/<input[^>]+name="__RequestVerificationToken"[^>]+value="([^"]+)"/);
    if (!tokenMatch) {
      return res.status(500).json({ error: 'Token no encontrado' });
    }
    const token = tokenMatch[1];

    // Preparar los datos del formulario para el POST
    const formData = new URLSearchParams();
    formData.append('TipoID', '3');
    formData.append('documento', documento);
    formData.append('__RequestVerificationToken', token);

    // Solicitud POST para obtener los datos deseados
    const postResponse = await axios.post(
      'https://reportes.sisben.gov.co/dnp_sisbenconsulta',
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': cookie
        }
      }
    );

    // Cargar la respuesta HTML y extraer los datos usando cheerio
    const $ = cheerio.load(postResponse.data);
    const nombresStr = $('p.etiqueta1:contains("Nombres:")')
      .next('p.campo1')
      .text()
      .trim();
    const apellidosStr = $('p.etiqueta1:contains("Apellidos:")')
      .next('p.campo1')
      .text()
      .trim();

    // Separar nombres y apellidos por espacios en blanco
    const nombresArr = nombresStr.split(/\s+/);
    const apellidosArr = apellidosStr.split(/\s+/);

    const nombre1 = nombresArr[0] || '';
    const nombre2 = nombresArr[1] || '';
    const apellido1 = apellidosArr[0] || '';
    const apellido2 = apellidosArr[1] || '';

    res.json({
      nombre1,
      nombre2,
      apellido1,
      apellido2
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
