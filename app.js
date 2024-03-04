const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const app = express();
const port = 3000; 

app.use(express.json());
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'pass', // encriptar con archivo .env
  database: 'basededatosapp'
});

connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
  } else {
    console.log('Conectado a la base de datos MySQL');
  }
});


// insertar datos en la tabla de beneficiarios
app.post('/api/registro', (req, res) => {
    const { nombre, apellido, numerodedocumento, TipodeDocumento } = req.body;
    connection.query('INSERT INTO beneficiarios (nombre, apellido, NumerodeDocumento, TipodeDocumento) VALUES (?, ?, ?, ?)', [nombre, apellido, numerodedocumento, TipodeDocumento], (err, results) => {
      if (err) {
        console.error('Error al registrar beneficiario:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
      } else {
        res.json({ mensaje: 'Beneficiario registrado correctamente' });
      }
    });
  });

// insertar datos en la tabla de oficinas 
  app.post('/api/oficina', (req, res) => {
    const { descripcion } = req.body;
    connection.query('INSERT INTO oficinas (descripcion) VALUES (?)', [descripcion], (err, results) => {
      if (err) {
        console.error('Error al registrar oficina:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
      } else {
        res.json({ mensaje: 'Oficina registrada correctamente'});
      }
    });
  });

  // insertar datos en subsidios
  app.post('/api/nuevosubsidio', (req, res) => {
    const { descripcionsub, oficinasolicitante, fecha_de_alta, año, mes, estado } = req.body; 
    connection.query('INSERT INTO subsidios (descripcion, oficinasolicitante, fecha_de_alta, año, mes, estado) VALUES (?, ?, ?, ?, ?, ?)', [descripcionsub, oficinasolicitante, fecha_de_alta, año, mes, estado], (err, results) => {
      if (err) {
        console.error('Error al registrar subsidio:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
      } else {
        res.json({ mensaje: 'Subsidio registrado correctamente' });
      }
    });
  });
  // insertar datos en subsidiosdetalle
  app.post('/api/detallesubsidio', (req, res) => {
    const { IDSUB, IDBENEF, importesub, estadosub } = req.body;
  if (importesub > 1000000) {
    return res.status(400).json({ error: 'El importe no puede ser superior a $1,000,000.00' });
  } 
    connection.query('INSERT INTO subsidiosdetalle (IdSubsidio, IdBeneficiario, Importe, Estado) VALUES (?, ?, ?, ?)', [IDSUB, IDBENEF, importesub, estadosub], (err, results) => {
      if (err) {
        console.error('Error al registrar detalle subsidio:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
      } else {
        res.json({ mensaje: 'Detalle subsidio registrado correctamente' });
      }
    });
  });


// eliminar un subsidio
app.delete('/api/eliminar-subsidio/:id', (req, res) => {
  const subsidioId = req.params.id;
  const query = 'DELETE FROM subsidios WHERE IdSubsidio = ?';
  connection.query(query, [subsidioId], (err, result) => {
    if (err) {
      console.error('Error al eliminar el subsidio:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    if (result.affectedRows > 0) {
      res.json({ mensaje: 'Subsidio eliminado correctamente' });
    } else {
      res.status(404).json({ error: 'Subsidio no encontrado' });
    }
  });
});

// eliminar un detalle subsidio
app.delete('/api/eliminar-detalle/:id', (req, res) => {
  const detalleID = req.params.id;
  const query = 'DELETE FROM subsidiosdetalle WHERE IdSubsidioDetalle = ?';
  connection.query(query, [detalleID], (err, result) => {
    if (err) {
      console.error('Error al eliminar el detalle subsidio:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    if (result.affectedRows > 0) {
      res.json({ mensaje: 'Detalle subsidio eliminado correctamente' });
    } else {
      res.status(404).json({ error: 'Detalle subsidio no encontrado' });
    }
  });
});

// para obtener todos los subsidios
app.get('/api/subsidios', (req, res) => {
  const query = 'SELECT * FROM subsidios';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener subsidios:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    res.json(results);
  });
});

// obtener todas las oficinas
app.get('/api/oficinas', (req, res) => {
  const query = 'SELECT * FROM oficinas';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener oficinas:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    res.json(results);
  });
});

// obtener todos los beneficiarios
app.get('/api/beneficiarios', (req, res) => {
  const query = 'SELECT * FROM beneficiarios';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener beneficiarios:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    res.json(results);
  });
});

// para obtener todos los detalles de subsidios solicitados
app.get('/api/detallesubsidiossolicitados', (req, res) => {
  const query = 'SELECT * FROM subsidiosdetalle';
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener subsidios:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
      return;
    }
    res.json(results);
  });
});

 // Generar y descargar el PDF de subsidios
app.get('/generar-pdf', (req, res) => {
  const queryBeneficiarios = 'SELECT * FROM beneficiarios';
  const querySubsidiosDetalle = 'SELECT * FROM subsidiosdetalle';
  connection.query(queryBeneficiarios, (errorBeneficiarios, resultsBeneficiarios) => {
    if (errorBeneficiarios) throw errorBeneficiarios;
    connection.query(querySubsidiosDetalle, (errorSubsidiosDetalle, resultsSubsidiosDetalle) => {
      if (errorSubsidiosDetalle) throw errorSubsidiosDetalle;
      const doc = new PDFDocument({ margin: 50 });
      doc.fontSize(18).text('Registro de solicitud de subsidios', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text('Lista de beneficiarios', { underline: true });
      resultsBeneficiarios.forEach((row) => {
        doc.text(`ID: ${row.IdBeneficiario} - Nombre y Apellido: ${row.Nombre} ${row.Apellido} - DNI: ${row.NumerodeDocumento}`);
      });
      doc.moveDown();
      doc.fontSize(16).text('Detalles de subsidios', { underline: true });
      resultsSubsidiosDetalle.forEach((row) => {
        doc.text(`ID: ${row.IdSubsidioDetalle} - Importe: $${row.Importe} - ID Beneficiario: ${row.IdBeneficiario} - Estado: ${row.Estado}`);
      });
      res.type('application/pdf');
      doc.pipe(res);
      doc.end();
    });
  });
});

// generar y descargar PDF con subsidiosdetalle por IdBeneficiario
app.get('/generar-pdf-beneficiario/:IdBeneficiario', (req, res) => {
  const { IdBeneficiario } = req.params;

  const query = `
  SELECT subsidiosdetalle.*, beneficiarios.Nombre, beneficiarios.Apellido, beneficiarios.NumerodeDocumento, subsidios.Descripcion, oficinas.Descripcion AS DescripcionOficina
  FROM subsidiosdetalle
  INNER JOIN beneficiarios ON subsidiosdetalle.IdBeneficiario = beneficiarios.IdBeneficiario
  INNER JOIN subsidios ON subsidiosdetalle.IdSubsidio = subsidios.IdSubsidio
  INNER JOIN oficinas ON subsidios.OficinaSolicitante = oficinas.IdOficina
  WHERE subsidiosdetalle.IdBeneficiario = ?;
`;

  console.log('IdBeneficiario utilizado:', IdBeneficiario);
  console.log('Consulta SQL:', query);

  connection.query(query, [IdBeneficiario], (error, results) => {
    if (error) {
      console.error('Error al obtener datos para el PDF:', error);
      return res.status(500).json({ error: 'Error al obtener datos para el PDF' });
    }

    console.log('Resultados de la consulta:', results);

    if (results.length === 0) {
      console.warn('No se encontraron subsidiosdetalle para el IdBeneficiario especificado');
      return res.status(404).json({ error: 'No se encontraron subsidiosdetalle para el IdBeneficiario especificado' });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=subsidiosdetalle-beneficiario-${IdBeneficiario}.pdf`);

    doc.pipe(res);

    doc.fontSize(16).text('Listado de subsidios', { align: 'center' });

    results.forEach((subsidio) => {
      // convierto importe a numero antes de llamar a toFixed
      const importeNumerico = parseFloat(subsidio.Importe);
      doc.moveDown().text(`ID: ${subsidio.IdSubsidioDetalle}, Importe: $${importeNumerico.toFixed(2)}`);
      doc.text(`Nombre: ${subsidio.Nombre}, Apellido: ${subsidio.Apellido}, Documento: ${subsidio.NumerodeDocumento}`);
      doc.text(`Descripción del Subsidio: ${subsidio.Descripcion}`);
      doc.text(`Descripción de la Oficina Solicitante: ${subsidio.DescripcionOficina}`);
    });

    doc.end();
  });
});
//  generar y descargar pdf subsidiodetalles desde IdOficina
app.get('/generar-pdf-oficina/:IdOficina/:fechaInicio/:fechaFin', (req, res) => {
  const { IdOficina, fechaInicio, fechaFin } = req.params;

  
  const query = `
  SELECT subsidiosdetalle.*, beneficiarios.Nombre, beneficiarios.Apellido, beneficiarios.NumerodeDocumento, subsidios.Descripcion, oficinas.Descripcion AS DescripcionOficina
  FROM subsidiosdetalle
  INNER JOIN beneficiarios ON subsidiosdetalle.IdBeneficiario = beneficiarios.IdBeneficiario
  INNER JOIN subsidios ON subsidiosdetalle.IdSubsidio = subsidios.IdSubsidio
  INNER JOIN oficinas ON subsidios.OficinaSolicitante = oficinas.IdOficina
  WHERE oficinas.IdOficina = ? AND subsidios.Fecha_De_Alta BETWEEN ? AND ?;
`;

console.log('IdOficina utilizado:', IdOficina);
console.log('Consulta SQL:', query);

connection.query(query, [IdOficina, fechaInicio, fechaFin], (error, results) => {
    if (error) {
      console.error('Error al obtener datos para el PDF:', error);
      return res.status(500).json({ error: 'Error al obtener datos para el PDF' });
    }

    console.log('Resultados de la consulta:', results);

    if (results.length === 0) {
      console.warn('No se encontraron subsidiosdetalle para el IdOficina especificado');
      return res.status(404).json({ error: 'No se encontraron subsidiosdetalle para el IdOficina especificado' });
    }

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=subsidiosdetalle-oficina-${IdOficina}.pdf`);

    doc.pipe(res);

    doc.fontSize(16).text('Listado de subsidios', { align: 'center' });

    results.forEach((subsidio) => {
      // convertir importe a numero antes de llamar a toFixed
      const importeNumerico = parseFloat(subsidio.Importe);
      doc.moveDown().text(`ID: ${subsidio.IdSubsidioDetalle}, Importe: $${importeNumerico.toFixed(2)}`);
      doc.text(`Nombre: ${subsidio.Nombre}, Apellido: ${subsidio.Apellido}, Documento: ${subsidio.NumerodeDocumento}`);
      doc.text(`Descripción del Subsidio: ${subsidio.Descripcion}`);
      doc.text(`Descripción de la Oficina Solicitante: ${subsidio.DescripcionOficina}`);
    });

    doc.end();
  });
});

// INICIO EL SERVER
app.listen(port, () => {
  console.log(`Servidor iniciado en http://localhost:${port}`);
});