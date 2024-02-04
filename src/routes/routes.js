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
const { format } = require('date-fns');

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
    const datos = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Obtener los datos como un array de arrays

    // Saltarse las filas de encabezado si es necesario
    const datosSinEncabezados = datos.slice(11);

    const datosProcesados = [];

    for (const fila of datosSinEncabezados) {
        // Convertir la fila a una cadena y buscar la subcadena 'total de envíos'
        const filaCompleta = fila.join(' ').toLowerCase();
        if (filaCompleta.includes('total de envíos')) {
            break; // Detener el bucle si se encuentra 'Total de envíos'
        }

        // Asegúrate de que la guía sea una cadena
        const guiaEnString = fila[0] ? fila[0].toString() : '';

        datosProcesados.push({
            guia: guiaEnString, // N° Guía (columnas B a D)
            ciudad_origen: fila[3], // Ciudad Origen (columnas E a J)
            direccion: fila[10], // Dirección (columnas L a N)
            forma_pago: fila[15], // Forma de pago (columna R)
            valor: fila[17], // Valor (columna S)
            contra_pago: fila[18] // Contra Pago (columna T)
        });
    }

    const nameFile = `Planilla_${Date.now()}.pdf`;

    generarCodigoBarraYPDF(datosProcesados, nameFile).then(() => {
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

        const date = new Date();
        const year = date.getFullYear();

        const formattedDate = format(date, 'dd-MM-yyyy hh:mm a');

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

                    doc.image(routeImageInter, 50, y, { width: 250, height: 53 });

                    doc.image(routeImage, 50, y + 310, { width: 15, height: 15 });
                    const vp = dato.valor.toFixed(0); // Redondear a 0 decimales
                    const formatter = new Intl.NumberFormat('es-ES'); // Crea un formateador para el estilo de número deseado (por ejemplo, español con comas como separador de miles)
                    const valorPago = formatter.format(vp); // Formatear el número 

                    doc.fontSize(25)
                        .font('Helvetica-Bold') // Cambiar a negrita
                        .text(dato.guia, 50, y + 70)
                        .font('Helvetica') // Restaurar el estilo original 

                    doc.fontSize(12)
                        .text(`Fecha de impresión: ${formattedDate}`,  320, y + 315)
                        .font('Helvetica-Bold') // Cambiar a negrita
                        .text('Ciudad Origen:', 50, y + 100)
                        .font('Helvetica') // Restaurar el estilo original                        
                        .text(dato.ciudad_origen, 150, y + 100) 
                        .font('Helvetica-Bold') // Cambiar a negrita                       
                        .text('Dirección:', 50, y + 120)
                        .font('Helvetica') // Restaurar el estilo original                        
                        .text(dato.direccion, 150, y + 120)
                        .font('Helvetica-Bold') // Cambiar a negrita
                        .text('Forma de pago:', 50, y + 150)
                        .font('Helvetica') // Restaurar el estilo original
                        .text(dato.forma_pago, 150, y + 150)                        
                        .image(png, 450, y, { fit: [100, 100] })
                        .font('Helvetica-Bold') // Cambiar a negrita
                        .text('Valor:', 50, y + 170)
                        .font('Helvetica')// Restaurar el estilo original
                        .text(`$ ${valorPago}`, 150, y + 170); 

                    // Coloca el cuadro para la firma del cliente
                    doc.rect(50, y + 210, 300, 70) // x, y, ancho, alto
                        .stroke();

                    doc.fontSize(12)   
                        .text('Firma del Cliente:', 54, y + 215);

                    doc.fontSize(16)
                        .font('Helvetica-Bold') // Cambiar a negrita
                        .text('VALOR A COBRAR', 405, y + 210)
                        .font('Helvetica') // Restaurar el estilo original;
                    
                    doc.fontSize(20)
                    if (dato.forma_pago === 'Crédito' || dato.forma_pago === 'Contado') {
                        // Si la forma de pago es 'Credito', mostrar dato.contra_pago
                        const contraPagoFormatted = dato.contra_pago.toLocaleString(); // Aplicar formato de miles
                        doc.text(`$${contraPagoFormatted}`, 405, y + 230);
                    } else if (dato.forma_pago === 'Al Cobro') {
                        // Si la forma de pago es 'Al cobro', calcular y mostrar la suma de dato.valor + dato.contra_pago
                        const valorTotal = dato.valor + dato.contra_pago;
                        const valorTotalFormatted = valorTotal.toLocaleString(); // Aplicar formato de miles
                        doc.text(`$${valorTotalFormatted}`, 405, y + 230);
                    }
                    
                    /* doc.moveTo(50, y + 280) // Comienza en x = 50, y = y + 220
                        .lineTo(150, y + 280) // Termina en x = 550, y = y + 220
                        .lineWidth(1) // Ancho de la línea (puedes ajustarlo según lo necesites)
                        .stroke(); // Dibuja la línea */
                    
                    doc.fontSize(8)
                        .text('SOFTWARE RAVEN', 70, y + 310)
                        .text(`© Developed by Jeff - ${year}`, 70, y + 320, {  italic: true, bold: true, fontSize: 8 });

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