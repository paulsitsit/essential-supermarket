import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { allowRoles } from '../middleware/roles.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { writeAudit } from '../utils/audit.js';

const router = Router();

router.use(protect);
router.use(allowRoles('admin', 'manager'));

function productFilter() {
  return {
    isArchived: false
  };
}

async function getInventoryRows() {
  const products = await Product.find(productFilter())
    .populate('category', 'name')
    .populate('supplier', 'name')
    .sort({ name: 1 })
    .lean();

  return products.map(product => ({
    product: product.name,
    barcode: product.barcode,
    sku: product.sku,
    category: product.category?.name || '',
    supplier: product.supplier?.name || '',
    currentStock: product.currentStock,
    reorderLevel: product.reorderLevel,
    unitType: product.unitType,
    costPrice: product.costPrice,
    inventoryValue: product.inventoryValue,
    status: product.status,
    branch: product.branch,
    updatedAt: product.updatedAt
  }));
}

async function getLowStockRows() {
  const products = await Product.find({
    ...productFilter(),
    $expr: {
      $lte: ['$currentStock', '$reorderLevel']
    }
  })
    .populate('category', 'name')
    .populate('supplier', 'name')
    .sort({ currentStock: 1 })
    .lean();

  return products.map(product => ({
    product: product.name,
    barcode: product.barcode,
    sku: product.sku,
    category: product.category?.name || '',
    supplier: product.supplier?.name || '',
    currentStock: product.currentStock,
    reorderLevel: product.reorderLevel,
    unitType: product.unitType,
    costPrice: product.costPrice,
    inventoryValue: product.inventoryValue,
    status: product.status,
    branch: product.branch
  }));
}

async function getMovementRows() {
  const movements = await StockMovement.find()
    .populate('product', 'name barcode sku')
    .populate('account', 'fullName role')
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  return movements.map(movement => ({
    product: movement.product?.name || '',
    barcode: movement.product?.barcode || '',
    sku: movement.product?.sku || '',
    movementType: movement.movementType,
    quantityChanged: movement.quantityChanged,
    previousStock: movement.previousStock,
    newStock: movement.newStock,
    reason: movement.reason,
    account: movement.account?.fullName || '',
    accountRole: movement.account?.role || '',
    createdAt: movement.createdAt
  }));
}

async function getReportRows(type) {
  if (type === 'inventory') {
    return getInventoryRows();
  }

  if (type === 'low-stock') {
    return getLowStockRows();
  }

  if (type === 'stock-movements') {
    return getMovementRows();
  }

  const error = new Error('Invalid report type');
  error.statusCode = 400;
  throw error;
}

async function sendCsv(res, filename, rows) {
  const csv = rows.length ? new Parser().parse(rows) : '';

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}.csv"`
  );

  res.send(csv);
}

async function sendExcel(res, filename, rows) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Report');

  const headers = rows.length
    ? Object.keys(rows[0])
    : ['message'];

  worksheet.columns = headers.map(header => ({
    header,
    key: header,
    width: 22
  }));

  if (rows.length) {
    worksheet.addRows(rows);
  } else {
    worksheet.addRow({ message: 'No records found' });
  }

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF166534' }
  };

  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}.xlsx"`
  );

  await workbook.xlsx.write(res);
  res.end();
}

function formatPdfValue(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function sendPdf(res, filename, rows) {
  const document = new PDFDocument({
    margin: 36,
    size: 'A4',
    layout: 'landscape'
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${filename}.pdf"`
  );

  document.pipe(res);

  document
    .fontSize(18)
    .fillColor('#166534')
    .text(`EssentialSupermarket - ${filename}`, {
      align: 'center'
    });

  document.moveDown();
  document.fontSize(8).fillColor('#333333');

  if (!rows.length) {
    document.text('No records found.');
    document.end();
    return;
  }

  const headers = Object.keys(rows[0]);
  const columnWidth = 720 / headers.length;
  let y = 90;

  headers.forEach((header, index) => {
    document
      .font('Helvetica-Bold')
      .text(header, 36 + index * columnWidth, y, {
        width: columnWidth - 4,
        ellipsis: true
      });
  });

  y += 18;

  rows.slice(0, 500).forEach(row => {
    if (y > 540) {
      document.addPage();
      y = 45;
    }

    headers.forEach((header, index) => {
      document
        .font('Helvetica')
        .text(
          formatPdfValue(row[header]),
          36 + index * columnWidth,
          y,
          {
            width: columnWidth - 4,
            ellipsis: true
          }
        );
    });

    y += 15;
  });

  if (rows.length > 500) {
    document.moveDown();
    document.text(`Showing 500 of ${rows.length} records.`);
  }

  document.end();
}

router.get('/:type', async (req, res, next) => {
  try {
    const { type } = req.params;
    const format = String(req.query.format || 'csv').toLowerCase();

    const rows = await getReportRows(type);
    const filename = `${type}-report`;

    await writeAudit({
      req,
      account: req.account,
      action: 'report_exported',
      affectedRecord: type,
      metadata: {
        format,
        rowCount: rows.length
      }
    });

    if (format === 'csv') {
      return sendCsv(res, filename, rows);
    }

    if (format === 'xlsx') {
      return sendExcel(res, filename, rows);
    }

    if (format === 'pdf') {
      return sendPdf(res, filename, rows);
    }

    return res.status(400).json({
      message: 'Invalid format. Use csv, xlsx, or pdf.'
    });
  } catch (error) {
    next(error);
  }
});

export default router;