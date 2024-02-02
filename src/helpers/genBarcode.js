const bwipjs = require('bwip-js');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const fs = require('fs');

function importarYProcesarExcel(rutaArchivo) {
    // Leer el archivo Excel
    const workbook = XLSX.readFile(rutaArchivo);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const datos = XLSX.utils.sheet_to_json(worksheet);

    datos.forEach(dato => {
        generarCodigoBarraYPDF(dato);
    });
}

function generarCodigoBarraYPDF(dato) {
    // Generar código de barras
    bwipjs.toBuffer({ bcid: 'code128', text: dato.guia }, function(err, png) {
        if (err) {
            console.error(err);
        } else {
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(`guia_${dato.guia}.pdf`);

            doc.pipe(stream);

            // Agregar texto e imagen al PDF
            doc.fontSize(12)
                .text(`Dirección: ${dato.direccion}`)
                .text(`Valor a Cobrar: ${dato.Valor}`)
                .text(`Nombre: ${dato.nombre}`, { align: 'left' })
                .image(png, 50, 150, { fit: [100, 100] })
                .text('Firma del Cliente:', 50, 250);

            // Finalizar el PDF
            doc.end();
        }
    });
}
