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
    stock_adjustment: 'Stock Adjustment',
    manual_correction: 'Manual Correction',
    returned_to_supplier: 'Returned to Supplier',
    branch_transfer: 'Branch Transfer'
  };

  return labels[type] || type || 'Unknown';
}

function isValidDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || '')
  );
}

function getSafeDateRange(query) {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const from = query.from || today;
  const to = query.to || from;

  if (
    !isValidDateString(from) ||
    !isValidDateString(to)
  ) {
    return null;
  }

  /*
   * Use local calendar date construction instead of parsing
   * YYYY-MM-DD as UTC. This avoids off-by-one-day behavior
   * around Philippine-time report boundaries.
   */
  const [
    fromYear,
    fromMonth,
    fromDay
  ] = from.split('-').map(Number);

  const [
    toYear,
    toMonth,
    toDay
  ] = to.split('-').map(Number);

  const fromDate = new Date(
    fromYear,
    fromMonth - 1,
    fromDay,
    0,
    0,
    0,
    0
  );

  const toDate = new Date(
    toYear,
    toMonth - 1,
    toDay,
    23,
    59,
    59,
    999
  );

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

function getDateKey(date) {
  const value = new Date(date);

  return [
    value.getFullYear(),
    value.getMonth() + 1,
    value.getDate()
  ].join('-');
}

function toReportDate(date) {
  const value = new Date(date);

  const year = value.getFullYear();

  const month = String(
    value.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    value.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
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
    const range = getSafeDateRange(query);

    if (!range) {
      const error = new Error(
        'Invalid date range. Use YYYY-MM-DD and ensure the end date is not before the start date.'
      );

      error.statusCode = 400;

      throw error;
    }

    filter.createdAt = {
      $gte: range.fromDate,
      $lte: range.toDate
    };
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
      {
        grossSales: Number(
          row.grossSales || 0
        ),
        transactions: Number(
          row.transactions || 0
        )
      }
    ])
  );

  const returnsMap = new Map(
    returnsByDay.map(row => [
      `${row._id.year}-${row._id.month}-${row._id.day}`,
      {
        refunds: Number(row.refunds || 0),
        returnsCount: Number(
          row.returnsCount || 0
        )
      }
    ])
  );

  const reportRows = [];

  const cursor = new Date(range.fromDate);

  while (cursor <= range.toDate) {
    const key = getDateKey(cursor);

    const sales = salesMap.get(key) || {
      grossSales: 0,
      transactions: 0
    };

    const returns = returnsMap.get(key) || {
      refunds: 0,
      returnsCount: 0
    };

    const grossSales = sales.grossSales;
    const refunds = returns.refunds;

    reportRows.push([
      toReportDate(cursor),
      grossSales,
      refunds,
      grossSales - refunds,
      sales.transactions,
      returns.returnsCount
    ]);

    cursor.setDate(
      cursor.getDate() + 1
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

  summary.averageReturn =
    summary.returnsCount > 0
      ? summary.refunds /
        summary.returnsCount
      : 0;

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
      ],
      [
        'Average Return',
        formatPeso(summary.averageReturn)
      ]
    ]
  };
}

function normalizeReportType(type) {
  const aliases = {
    inventory: 'inventory',

    'low-stock': 'low-stock',
    lowStock: 'low-stock',

    'stock-movements': 'stock-movements',
    movements: 'stock-movements',

    'sales-returns': 'sales-returns',
    salesReturns: 'sales-returns'
  };

  return aliases[type] || null;
}

async function getReport(type, query) {
  const normalizedType =
    normalizeReportType(type);

  const handlers = {
    inventory: getInventoryReport,
    'low-stock': getLowStockReport,
    'stock-movements': getMovementsReport,
    'sales-returns': getSalesReturnsReport
  };

  const handler = handlers[normalizedType];

  if (!handler) {
    const error = new Error(
      `Invalid report type: ${type}`
    );

    error.statusCode = 400;

    throw error;
  }

  const report = await handler(query);

  return {
    ...report,
    type: normalizedType
  };
}

function isCurrencyColumn(columnName) {
  return [
    'Cost Price',
    'Inventory Value',
    'Gross Sales',
    'Refunds',
    'Net Revenue'
  ].includes(columnName);
}

function sendPdf(res, report) {
  const document = new PDFDocument({
    margin: 36,
    size: 'A4',
    layout:
      report.columns.length > 6
        ? 'landscape'
        : 'portrait'
  });

  const fileName =
    `${report.type}-report.pdf`;

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
    .text(report.title);

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

    report.summary.forEach(
      ([label, value]) => {
        document
          .fillColor('#52725c')
          .fontSize(9)
          .text(`${label}: `, {
            continued: true
          })
          .fillColor('#153225')
          .text(String(value));
      }
    );

    document.moveDown(1);
  }

  const pageWidth =
    document.page.width -
    document.page.margins.left -
    document.page.margins.right;

  const columnWidth =
    pageWidth / report.columns.length;

  function drawHeader() {
    const y = document.y;

    document
      .rect(
        document.page.margins.left,
        y,
        pageWidth,
        20
      )
      .fill('#dcfce7');

    document
      .fillColor('#166534')
      .fontSize(7);

    report.columns.forEach(
      (column, index) => {
        document.text(
          column,
          document.page.margins.left +
            columnWidth * index +
            3,
          y + 6,
          {
            width: columnWidth - 6,
            height: 10,
            ellipsis: true
          }
        );
      }
    );

    document.y = y + 24;
  }

  drawHeader();

  report.rows.forEach(row => {
    const rowHeight = 19;

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
      const columnName =
        report.columns[index];

      const value = isCurrencyColumn(
        columnName
      )
        ? formatPeso(cell)
        : String(cell ?? '');

      document.text(
        value,
        document.page.margins.left +
          columnWidth * index +
          3,
        y + 5,
        {
          width: columnWidth - 6,
          height: 11,
          ellipsis: true
        }
      );
    });

    document.y = y + rowHeight;
  });

  document.end();
}

async function sendExcel(res, report) {
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

  worksheet.getCell(1, 1).value =
    'Essential Supermarket';

  worksheet.getCell(1, 1).font = {
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

  worksheet.getCell(2, 1).value =
    report.title;

  worksheet.getCell(2, 1).font = {
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
    const summarySheet =
      workbook.addWorksheet('Summary');

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

    report.summary.forEach(
      ([label, value]) => {
        summarySheet.addRow([
          label,
          value
        ]);
      }
    );

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

  worksheet.columns.forEach(
    (column, index) => {
      const heading =
        report.columns[index] || '';

      column.width = Math.min(
        Math.max(heading.length + 3, 14),
        28
      );
    }
  );

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

  const fileName =
    `${report.type}-report.xlsx`;

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
      req.params.type,
      req.query
    );

    await writeAudit({
      req,
      account: req.account,
      action: 'report_exported',
      affectedRecord:
        `${report.type}_${format}`
    });

    if (format === 'pdf') {
      sendPdf(res, report);
      return;
    }

    await sendExcel(res, report);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        message: error.message
      });
    }

    next(error);
  }
}