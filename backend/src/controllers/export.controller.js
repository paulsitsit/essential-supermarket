import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import Sale from '../models/Sale.js';
import SaleReturn from '../models/SaleReturn.js';

import { writeAudit } from '../utils/audit.js';

function productFilter(query) {
  const filter = {
    isArchived: false
  };

  if (query.category) {
    filter.category = query.category;
  }

  if (query.supplier) {
    filter.supplier = query.supplier;
  }

  if (query.status) {
    filter.status = query.status;
  }

  if (query.branch) {
    filter.branch = query.branch;
  }

  if (query.product) {
    filter._id = query.product;
  }

  return filter;
}

function formatDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatDateOnly(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium'
  }).format(date);
}

function formatPeso(value) {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(value) || 0);
}

function getMovementLabel(type) {
  const labels = {
    stock_in: 'Stock In',
    stock_out: 'Stock Out',
    sale: 'Sale',
    return: 'Return',
    damaged: 'Damaged',
    expired: 'Expired',
    adjustment: 'Adjustment',
    manual_correction: 'Manual Correction',
    returned_to_supplier: 'Returned to Supplier',
    branch_transfer: 'Branch Transfer'
  };

  return labels[type] || type || 'Unknown';
}

function getSafeDateRange(query) {
  const today = new Date().toISOString().slice(0, 10);

  const from = query.from || today;
  const to = query.to || from;

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  if (
    Number.isNaN(fromDate.getTime()) ||
    Number.isNaN(toDate.getTime()) ||
    toDate < fromDate
  ) {
    return null;
  }

  return {
    from,
    to,
    fromDate,
    toDate
  };
}

async function getInventoryReport(query) {
  const products = await Product.find(
    productFilter(query)
  )
    .populate('category supplier', 'name')
    .sort({ name: 1 })
    .lean();

  return {
    title: 'Current Inventory Report',
    columns: [
      'Product',
      'Barcode',
      'SKU',
      'Category',
      'Supplier',
      'Current Stock',
      'Reorder Level',
      'Cost Price',
      'Inventory Value',
      'Status'
    ],
    rows: products.map(product => [
      product.name || '',
      product.barcode || '',
      product.sku || '',
      product.category?.name || '',
      product.supplier?.name || '',
      Number(product.currentStock || 0),
      Number(product.reorderLevel || 0),
      Number(product.costPrice || 0),
      Number(product.inventoryValue || 0),
      product.status || ''
    ])
  };
}

async function getLowStockReport(query) {
  const products = await Product.find({
    ...productFilter(query),
    status: {
      $in: [
        'low_stock',
        'out_of_stock'
      ]
    }
  })
    .populate('category supplier', 'name')
    .sort({
      currentStock: 1,
      name: 1
    })
    .lean();

  return {
    title: 'Low-Stock Report',
    columns: [
      'Product',
      'Barcode',
      'SKU',
      'Category',
      'Supplier',
      'Current Stock',
      'Reorder Level',
      'Status'
    ],
    rows: products.map(product => [
      product.name || '',
      product.barcode || '',
      product.sku || '',
      product.category?.name || '',
      product.supplier?.name || '',
      Number(product.currentStock || 0),
      Number(product.reorderLevel || 0),
      product.status || ''
    ])
  };
}

async function getMovementsReport(query) {
  const filter = {};

  if (query.product) {
    filter.product = query.product;
  }

  if (query.account) {
    filter.account = query.account;
  }

  if (query.movementType) {
    filter.movementType = query.movementType;
  }

  if (query.from || query.to) {
    filter.createdAt = {};

    if (query.from) {
      filter.createdAt.$gte = new Date(
        `${query.from}T00:00:00.000Z`
      );
    }

    if (query.to) {
      filter.createdAt.$lte = new Date(
        `${query.to}T23:59:59.999Z`
      );
    }
  }

  const movements = await StockMovement.find(filter)
    .populate('product', 'name barcode sku')
    .populate('account', 'fullName role')
    .sort({ createdAt: -1 })
    .lean();

  return {
    title: 'Stock Movement Report',
    columns: [
      'Date',
      'Product',
      'Barcode',
      'Movement Type',
      'Quantity Changed',
      'Previous Stock',
      'New Stock',
      'Reason',
      'Account'
    ],
    rows: movements.map(movement => [
      formatDate(movement.createdAt),
      movement.product?.name || '',
      movement.product?.barcode || '',
      getMovementLabel(movement.movementType),
      Number(movement.quantityChanged || 0),
      Number(movement.previousStock || 0),
      Number(movement.newStock || 0),
      movement.reason || '',
      movement.account?.fullName || ''
    ])
  };
}

async function getSalesReturnsReport(query) {
  const range = getSafeDateRange(query);

  if (!range) {
    const error = new Error(
      'Invalid date range. Use YYYY-MM-DD and ensure the end date is not before the start date.'
    );

    error.statusCode = 400;

    throw error;
  }

  const salesByDay = await Sale.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: {
          $gte: range.fromDate,
          $lte: range.toDate
        }
      }
    },
    {
      $group: {
        _id: {
          year: {
            $year: '$createdAt'
          },
          month: {
            $month: '$createdAt'
          },
          day: {
            $dayOfMonth: '$createdAt'
          }
        },
        grossSales: {
          $sum: '$totalAmount'
        },
        transactions: {
          $sum: 1
        }
      }
    }
  ]);

  const returnsByDay = await SaleReturn.aggregate([
    {
      $match: {
        createdAt: {
          $gte: range.fromDate,
          $lte: range.toDate
        }
      }
    },
    {
      $group: {
        _id: {
          year: {
            $year: '$createdAt'
          },
          month: {
            $month: '$createdAt'
          },
          day: {
            $dayOfMonth: '$createdAt'
          }
        },
        refunds: {
          $sum: '$totalRefund'
        },
        returnsCount: {
          $sum: 1
        }
      }
    }
  ]);

  const salesMap = new Map(
    salesByDay.map(row => [
      `${row._id.year}-${row._id.month}-${row._id.day}`,
      row
    ])
  );

  const returnsMap = new Map(
    returnsByDay.map(row => [
      `${row._id.year}-${row._id.month}-${row._id.day}`,
      row
    ])
  );

  const reportRows = [];

  const cursor = new Date(range.fromDate);
  const end = new Date(range.toDate);

  while (cursor <= end) {
    const key = [
      cursor.getUTCFullYear(),
      cursor.getUTCMonth() + 1,
      cursor.getUTCDate()
    ].join('-');

    const sales = salesMap.get(key) || {};
    const returns = returnsMap.get(key) || {};

    const grossSales = Number(
      sales.grossSales || 0
    );

    const refunds = Number(
      returns.refunds || 0
    );

    reportRows.push([
      cursor.toISOString().slice(0, 10),
      grossSales,
      refunds,
      grossSales - refunds,
      Number(sales.transactions || 0),
      Number(returns.returnsCount || 0)
    ]);

    cursor.setUTCDate(
      cursor.getUTCDate() + 1
    );
  }

  const summary = reportRows.reduce(
    (result, row) => {
      result.grossSales += row[1];
      result.refunds += row[2];
      result.netRevenue += row[3];
      result.transactions += row[4];
      result.returnsCount += row[5];

      return result;
    },
    {
      grossSales: 0,
      refunds: 0,
      netRevenue: 0,
      transactions: 0,
      returnsCount: 0
    }
  );

  return {
    title: 'Sales & Returns Report',
    subtitle: `Period: ${range.from} to ${range.to}`,
    columns: [
      'Date',
      'Gross Sales',
      'Refunds',
      'Net Revenue',
      'Transactions',
      'Returns'
    ],
    rows: reportRows,
    summary: [
      [
        'Gross Sales',
        formatPeso(summary.grossSales)
      ],
      [
        'Refunds',
        formatPeso(summary.refunds)
      ],
      [
        'Net Revenue',
        formatPeso(summary.netRevenue)
      ],
      [
        'Transactions',
        String(summary.transactions)
      ],
      [
        'Return Records',
        String(summary.returnsCount)
      ]
    ]
  };
}

async function getReport(type, query) {
  const handlers = {
    inventory: getInventoryReport,
    'low-stock': getLowStockReport,
    'stock-movements': getMovementsReport,
    'sales-returns': getSalesReturnsReport
  };

  const handler = handlers[type];

  if (!handler) {
    const error = new Error(
      `Unknown export type: ${type}`
    );

    error.statusCode = 404;

    throw error;
  }

  return handler(query);
}

function sendPdf(res, report, type) {
  const document = new PDFDocument({
    margin: 36,
    size: 'A4',
    layout: report.columns.length > 6
      ? 'landscape'
      : 'portrait'
  });

  const fileName = `${type}-report.pdf`;

  res.setHeader(
    'Content-Type',
    'application/pdf'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName}"`
  );

  document.pipe(res);

  document
    .fillColor('#166534')
    .fontSize(18)
    .text('Essential Supermarket');

  document
    .fillColor('#153225')
    .fontSize(14)
    .text(report.title, {
      continued: false
    });

  if (report.subtitle) {
    document
      .fillColor('#52725c')
      .fontSize(9)
      .text(report.subtitle);
  }

  document
    .fillColor('#789484')
    .fontSize(8)
    .text(
      `Generated: ${formatDate(new Date())}`
    );

  document.moveDown(1);

  if (report.summary?.length) {
    document
      .fillColor('#153225')
      .fontSize(10)
      .text('Summary');

    document.moveDown(0.3);

    report.summary.forEach(([label, value]) => {
      document
        .fillColor('#52725c')
        .fontSize(9)
        .text(`${label}: `, {
          continued: true
        })
        .fillColor('#153225')
        .text(value);
    });

    document.moveDown(1);
  }

  const pageWidth =
    document.page.width -
    document.page.margins.left -
    document.page.margins.right;

  const columns = report.columns;
  const columnWidth = pageWidth / columns.length;

  function drawHeader() {
    const y = document.y;

    document
      .rect(
        document.page.margins.left,
        y,
        pageWidth,
        18
      )
      .fill('#dcfce7');

    document
      .fillColor('#166534')
      .fontSize(7);

    columns.forEach((column, index) => {
      document.text(
        column,
        document.page.margins.left +
          columnWidth * index +
          3,
        y + 5,
        {
          width: columnWidth - 6,
          height: 10,
          ellipsis: true
        }
      );
    });

    document.y = y + 22;
  }

  drawHeader();

  report.rows.forEach(row => {
    const rowHeight = 18;

    if (
      document.y + rowHeight >
      document.page.height -
        document.page.margins.bottom
    ) {
      document.addPage();
      drawHeader();
    }

    const y = document.y;

    document
      .strokeColor('#e5e7eb')
      .moveTo(
        document.page.margins.left,
        y + rowHeight
      )
      .lineTo(
        document.page.margins.left +
          pageWidth,
        y + rowHeight
      )
      .stroke();

    document
      .fillColor('#315c3d')
      .fontSize(7);

    row.forEach((cell, index) => {
      let value = cell ?? '';

      if (
        [
          'Cost Price',
          'Inventory Value',
          'Gross Sales',
          'Refunds',
          'Net Revenue'
        ].includes(columns[index])
      ) {
        value = formatPeso(value);
      }

      document.text(
        String(value),
        document.page.margins.left +
          columnWidth * index +
          3,
        y + 5,
        {
          width: columnWidth - 6,
          height: 10,
          ellipsis: true
        }
      );
    });

    document.y = y + rowHeight;
  });

  document.end();
}

async function sendExcel(res, report, type) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = 'Essential Supermarket';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(
    report.title.slice(0, 31)
  );

  worksheet.mergeCells(
    1,
    1,
    1,
    report.columns.length
  );

  const titleCell = worksheet.getCell(1, 1);

  titleCell.value = 'Essential Supermarket';
  titleCell.font = {
    bold: true,
    size: 16,
    color: {
      argb: 'FF166534'
    }
  };

  worksheet.mergeCells(
    2,
    1,
    2,
    report.columns.length
  );

  const reportTitleCell = worksheet.getCell(2, 1);

  reportTitleCell.value = report.title;
  reportTitleCell.font = {
    bold: true,
    size: 12,
    color: {
      argb: 'FF153225'
    }
  };

  let headerRowNumber = 4;

  if (report.subtitle) {
    worksheet.mergeCells(
      3,
      1,
      3,
      report.columns.length
    );

    worksheet.getCell(3, 1).value =
      report.subtitle;

    worksheet.getCell(3, 1).font = {
      italic: true,
      color: {
        argb: 'FF52725C'
      }
    };

    headerRowNumber = 5;
  }

  if (report.summary?.length) {
    const summarySheet = workbook.addWorksheet(
      'Summary'
    );

    summarySheet.getCell('A1').value =
      'Essential Supermarket';

    summarySheet.getCell('A1').font = {
      bold: true,
      size: 16,
      color: {
        argb: 'FF166534'
      }
    };

    summarySheet.getCell('A2').value =
      report.title;

    summarySheet.getCell('A2').font = {
      bold: true,
      size: 12
    };

    summarySheet.addRow([]);

    report.summary.forEach(([label, value]) => {
      summarySheet.addRow([
        label,
        value
      ]);
    });

    summarySheet.getColumn(1).width = 24;
    summarySheet.getColumn(2).width = 22;
  }

  const headerRow = worksheet.getRow(
    headerRowNumber
  );

  headerRow.values = report.columns;

  headerRow.eachCell(cell => {
    cell.font = {
      bold: true,
      color: {
        argb: 'FF166534'
      }
    };

    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: 'FFDCFCE7'
      }
    };

    cell.alignment = {
      vertical: 'middle'
    };
  });

  report.rows.forEach(row => {
    worksheet.addRow(row);
  });

  worksheet.columns.forEach((column, index) => {
    const heading = report.columns[index] || '';

    column.width = Math.min(
      Math.max(heading.length + 3, 14),
      26
    );
  });

  worksheet.autoFilter = {
    from: {
      row: headerRowNumber,
      column: 1
    },
    to: {
      row: headerRowNumber,
      column: report.columns.length
    }
  };

  worksheet.views = [
    {
      state: 'frozen',
      ySplit: headerRowNumber
    }
  ];

  const fileName = `${type}-report.xlsx`;

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${fileName}"`
  );

  await workbook.xlsx.write(res);

  res.end();
}

export async function exportReport(
  req,
  res,
  next
) {
  try {
    const type = req.params.type;

    const format = String(
      req.query.format || 'xlsx'
    ).toLowerCase();

    if (
      ![
        'pdf',
        'xlsx'
      ].includes(format)
    ) {
      return res.status(400).json({
        message:
          'Unsupported format. Use pdf or xlsx.'
      });
    }

    const report = await getReport(
      type,
      req.query
    );

    await writeAudit({
      req,
      account: req.account,
      action: 'report_exported',
      affectedRecord: `${type}_${format}`
    });

    if (format === 'pdf') {
      sendPdf(res, report, type);
      return;
    }

    await sendExcel(res, report, type);
  } catch (error) {
    next(error);
  }
}