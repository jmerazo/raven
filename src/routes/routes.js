const { Router } = require('express');
const router = Router();
const multer = require('multer');
const cors = require('cors');
const corsOptions = require('../helpers/cors');
const bwipjs = require('bwip-js');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function verifyDirPDF() {
    // Subir dos niveles en la estructura de directorios si esta función se encuentra en 'proyecto/routes'
    const dir = path.join(__dirname, '..', '..', 'pdfs');
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

function importarYProcesarExcel(rutaArchivo, res) {
    // Leer el archivo Excel
    const workbook = XLSX.readFile(rutaArchivo);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const datos = XLSX.utils.sheet_to_json(worksheet);

    const nameFile = `guia_${Date.now()}.pdf`;

    generarCodigoBarraYPDF(datos, nameFile).then(() => {
        const routeFile = path.join(__dirname, '..', '..', 'pdfs', nameFile);
        res.sendFile(routeFile);
        /* res.json({ url: `localhost:6633/pdfs/${nameFile}` }); // Envía la URL del archivo PDF generado */
    }).catch((error) => {
        console.error(error);
        res.status(500).send('Ocurrió un error al generar el PDF.');
    });
}

function generarCodigoBarraYPDF(datos, nameFile) {
    return new Promise((resolve, reject) => {
        const dirPDF = verifyDirPDF();
        const routeFile = path.join(dirPDF, nameFile);
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const stream = fs.createWriteStream(routeFile);
        doc.pipe(stream);

        doc.moveTo(50, 390).lineTo(550, 390).stroke();

        const routeImage = path.join(__dirname, '..', '..', 'resources', 'icon', 'log_raven.png');
        const routeImageInter = path.join(__dirname, '..', '..', 'resources', 'icon', 'interrapidisimo.png');

        // Generar promesas para cada código de barras
        const promesas = datos.map((dato, index) => {
            return new Promise((resolveBarra, rejectBarra) => {
                const y = index % 2 === 0 ? 50 : 400;
                bwipjs.toBuffer({ bcid: 'code128', text: dato.guia }, function(err, png) {
                    if (err) {
                        return rejectBarra(err);
                    }

                    if (index % 2 === 0 && index !== 0) {
                        doc.addPage();
                        doc.moveTo(50, 390).lineTo(550, 390).stroke();
                    } 

                    doc.image(routeImageInter, 50, y, { width: 150, height: 50 });

                    doc.image(routeImage, 50, y + 320, { width: 15, height: 15 });

                    doc.fontSize(12)
                        .text(`Nombre: ${dato.nombre}`, 50, y + 60)
                        .text(`Dirección: ${dato.direccion}`, 50, y + 80)
                        .text(`Valor a Cobrar: ${dato.valor}`, 50, y + 100)
                        .text('Firma del Cliente:', 50, y + 180)
                        .image(png, 450, y, { fit: [100, 100] })
                        .text(dato.guia, 450, y + 80)
                    
                    doc.moveTo(50, y + 280) // Comienza en x = 50, y = y + 220
                        .lineTo(150, y + 280) // Termina en x = 550, y = y + 220
                        .lineWidth(1) // Ancho de la línea (puedes ajustarlo según lo necesites)
                        .stroke(); // Dibuja la línea
                    
                    doc.fontSize(8)
                        .text('© Develop for Jeff', 480, y + 320, {  italic: true, bold: true, fontSize: 8 });

                    resolveBarra();
                });
            });
        });

        // Esperar a que todas las promesas de códigos de barras se resuelvan
        Promise.all(promesas).then(() => {
            doc.end();
            stream.on('finish', () => resolve(nameFile));
            stream.on('error', reject);
        }).catch(reject);
    });
}

// Configura multer (puedes cambiar 'uploads/' a cualquier otra carpeta)
const upload = multer({ dest: 'uploads/' });

// Route information to connect to API
router.get('/', cors(corsOptions), (req, res) => 
    {res.status(200).json({message: 'Connect to our API RAVEN'})}
)

// Ruta para manejar la carga de archivos
router.post('/uploadDataGuide', cors(corsOptions), upload.single('archivo'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se cargó ningún archivo.');
    }

    importarYProcesarExcel(req.file.path, res);
    // Elimina la siguiente línea para evitar enviar una respuesta duplicada
    // res.send('Archivo cargado y procesado.');
});

module.exports = router;