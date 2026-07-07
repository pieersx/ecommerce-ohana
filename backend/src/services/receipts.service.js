const PDFDocument = require('pdfkit');

const httpError = require('../utils/httpError');

const paidStatuses = new Set(['Pagado', 'Enviado', 'Entregado']);

function money(value) {
  return `S/ ${Number(value || 0).toFixed(2)}`;
}

function safeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function assertCanDownloadReceipt(order) {
  if (!paidStatuses.has(order.estado)) {
    throw httpError(409, 'La boleta estara disponible cuando el pedido este pagado.');
  }
}

function drawRow(doc, y, columns, values, bold = false) {
  doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9);
  values.forEach((value, index) => {
    const column = columns[index];
    doc.text(safeText(value), column.x, y, {
      width: column.w,
      align: column.align || 'left',
    });
  });
}

function writeReceiptPdf(order, stream) {
  assertCanDownloadReceipt(order);

  const doc = new PDFDocument({ size: 'A4', margin: 42, info: { Title: `Boleta Ohana ${order.id_pedido}` } });
  doc.pipe(stream);

  doc
    .rect(0, 0, doc.page.width, 92)
    .fill('#fff7f5')
    .fillColor('#3a1711')
    .font('Helvetica-Bold')
    .fontSize(24)
    .text('Ohana Moments', 42, 30)
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#7a625d')
    .text('Regalos personalizados - Lima, Peru', 42, 60);

  doc
    .fillColor('#ef4f73')
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('BOLETA ELECTRONICA', 360, 28, { width: 190, align: 'right' })
    .fontSize(11)
    .fillColor('#3a1711')
    .text(`B-${String(order.id_pedido).padStart(6, '0')}`, 360, 55, { width: 190, align: 'right' });

  let y = 120;
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#3a1711').text('Cliente', 42, y);
  doc.font('Helvetica').fontSize(10).fillColor('#3a1711');
  y += 20;
  doc.text(`Nombre: ${safeText(order.cliente_nombre || 'Cliente')}`, 42, y);
  doc.text(`Email: ${safeText(order.cliente_email || '-')}`, 42, y + 15);
  doc.text(`Telefono: ${safeText(order.telefono_contacto || '-')}`, 42, y + 30);
  doc.text(`Direccion: ${safeText(order.direccion_envio || order.direccion_calle || '-')}`, 300, y, { width: 250 });
  doc.text(`Distrito: ${safeText(order.distrito_nombre || '-')}`, 300, y + 30);
  doc.text(`Fecha: ${new Date(order.fecha_pedido).toLocaleString('es-PE')}`, 300, y + 45);

  y += 82;
  doc.moveTo(42, y).lineTo(553, y).strokeColor('#f3ccd4').stroke();
  y += 18;

  const columns = [
    { x: 42, w: 210 },
    { x: 252, w: 55, align: 'right' },
    { x: 317, w: 75, align: 'right' },
    { x: 402, w: 65, align: 'right' },
    { x: 477, w: 76, align: 'right' },
  ];
  drawRow(doc, y, columns, ['Producto', 'Cant.', 'Unitario', 'Pers.', 'Subtotal'], true);
  y += 18;
  doc.moveTo(42, y).lineTo(553, y).strokeColor('#f3ccd4').stroke();
  y += 10;

  for (const line of order.detalles || []) {
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
    const config = [
      line.color_producto && `Color ${line.color_producto}`,
      line.configuracion?.figura && `Figura ${line.configuracion.figura}`,
      line.talla && `Talla ${line.talla}`,
      line.tamano && `Tamano ${line.tamano}`,
      line.texto_personalizado && `Texto: ${line.texto_personalizado}`,
    ].filter(Boolean).join(' | ');
    drawRow(doc, y, columns, [
      line.producto_nombre || 'Producto',
      line.cantidad,
      money(line.precio_unitario_fijado),
      money(line.precio_personalizacion),
      money(line.subtotal),
    ]);
    y += 14;
    if (config) {
      doc.font('Helvetica').fontSize(8).fillColor('#7a625d').text(config, 42, y, { width: 410 });
      y += 16;
    }
    y += 5;
  }

  y += 8;
  doc.moveTo(300, y).lineTo(553, y).strokeColor('#f3ccd4').stroke();
  y += 14;
  doc.font('Helvetica').fontSize(10).fillColor('#3a1711');
  doc.text('Productos', 360, y, { width: 100 });
  doc.text(money(order.total_productos), 477, y, { width: 76, align: 'right' });
  y += 18;
  doc.text('Envio', 360, y, { width: 100 });
  doc.text(money(order.costo_envio), 477, y, { width: 76, align: 'right' });
  y += 20;
  doc.font('Helvetica-Bold').fontSize(13);
  doc.text('Total', 360, y, { width: 100 });
  doc.text(money(order.monto_total), 477, y, { width: 76, align: 'right' });

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor('#7a625d')
    .text('Comprobante interno generado automaticamente por Ohana Moments. No reemplaza validacion SUNAT si el negocio aun no tiene proveedor fiscal configurado.', 42, 790, {
      width: 511,
      align: 'center',
    });

  doc.end();
}

module.exports = {
  assertCanDownloadReceipt,
  writeReceiptPdf,
};
