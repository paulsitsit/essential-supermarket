import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import LowStockAlert from '../models/LowStockAlert.js';
import ExpirationAlert from '../models/ExpirationAlert.js';
import Sale from '../models/Sale.js';
import SaleReturn from '../models/SaleReturn.js';

function salesTotals(match) {
  return Sale.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        revenue: { $sum: '$totalAmount' },
        itemsSold: { $sum: { $sum: '$items.quantity' } },
        transactions: { $sum: 1 }
      }
    }
  ]);
}

function refundTotals(match = {}) {
  return SaleReturn.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRefund: { $sum: '$totalRefund' }
      }
    }
  ]);
}

function numeric(value) {
  return Number(value) || 0;
}

function netRevenue(revenue, refunds) {
  return Math.max(numeric(revenue) - numeric(refunds), 0);
}

function localDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

export async function summary(req, res) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(
    startOfDay.getDate() - startOfDay.getDay()
  );

  const last7Days = [];

  for (let i = 6; i >= 0; i--) {
    const start = new Date(startOfDay);
    start.setDate(start.getDate() - i);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    last7Days.push({
      start,
      end,
      date: localDateKey(start),
      label: start.toLocaleDateString('en-PH', {
        weekday: 'short'
      }),
      fullDate: start.toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    });
  }

  const chartRange = {
    $gte: last7Days[0].start,
    $lt: last7Days[last7Days.length - 1].end
  };

  // Exact date intervals keep grouping aligned with displayed days.
  const chartDay = {
    $switch: {
      branches: last7Days.map((day, index) => ({
        case: {
          $and: [
            { $gte: ['$createdAt', day.start] },
            { $lt: ['$createdAt', day.end] }
          ]
        },
        then: index
      })),
      default: -1
    }
  };

  const [
    products,
    lowStock,
    outOfStock,
    movementToday,
    value,
    movementTypes,
    categoryData,
    lowStockAlerts,
    expirationAlerts,
    defectiveIds,
    allTimeSalesAgg,
    todaySalesAgg,
    weekSalesAgg,
    allTimeRefundsAgg,
    todayRefundsAgg,
    weekRefundsAgg,
    returnsTodayCount,
    bestSellerAgg,
    movementProductAgg,
    salesByDayAgg,
    refundsByDayAgg,
    salesProductAgg
  ] = await Promise.all([
    Product.countDocuments({ isArchived: false }),

    Product.countDocuments({
      isArchived: false,
      status: 'low_stock'
    }),

    Product.countDocuments({
      isArchived: false,
      status: 'out_of_stock'
    }),

    StockMovement.countDocuments({
      createdAt: { $gte: startOfDay }
    }),

    Product.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: null,
          total: { $sum: '$inventoryValue' },
          quantity: { $sum: '$currentStock' }
        }
      }
    ]),

    StockMovement.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      {
        $group: {
          _id: '$movementType',
          count: { $sum: 1 },
          quantity: { $sum: '$quantityChanged' }
        }
      },
      { $sort: { count: -1 } }
    ]),

    Product.aggregate([
      { $match: { isArchived: false } },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: {
          path: '$category',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: {
            $ifNull: ['$category.name', 'Uncategorized']
          },
          quantity: { $sum: '$currentStock' },
          value: { $sum: '$inventoryValue' }
        }
      },
      { $sort: { value: -1 } }
    ]),

    LowStockAlert.countDocuments({
      status: { $ne: 'resolved' }
    }),

    ExpirationAlert.countDocuments({
      status: { $ne: 'resolved' }
    }),

    StockMovement.distinct('product', {
      movementType: 'damaged',
      createdAt: { $gte: startOfDay }
    }),

    salesTotals({ status: 'completed' }),

    salesTotals({
      status: 'completed',
      createdAt: { $gte: startOfDay }
    }),

    salesTotals({
      status: 'completed',
      createdAt: { $gte: startOfWeek }
    }),

    refundTotals(),

    refundTotals({
      createdAt: { $gte: startOfDay }
    }),

    refundTotals({
      createdAt: { $gte: startOfWeek }
    }),

    SaleReturn.countDocuments({
      createdAt: { $gte: startOfDay }
    }),

    Sale.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startOfWeek }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          barcode: { $first: '$items.barcode' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { quantitySold: -1, revenue: -1, _id: 1 } },
      { $limit: 1 }
    ]),

    StockMovement.aggregate([
      { $match: { createdAt: chartRange } },
      { $addFields: { chartDay } },
      {
        $group: {
          _id: {
            day: '$chartDay',
            product: '$product',
            type: '$movementType'
          },
          unitsMoved: {
            $sum: {
              $abs: { $ifNull: ['$quantityChanged', 0] }
            }
          },
          netChange: { $sum: '$quantityChanged' },
          records: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            day: '$_id.day',
            product: '$_id.product'
          },
          unitsMoved: { $sum: '$unitsMoved' },
          records: { $sum: '$records' },
          movements: {
            $push: {
              type: '$_id.type',
              unitsMoved: '$unitsMoved',
              netChange: '$netChange',
              records: '$records'
            }
          }
        }
      },
      {
        $lookup: {
          from: Product.collection.name,
          localField: '_id.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      {
        $unwind: {
          path: '$productInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          id: '$_id.product',
          name: {
            $ifNull: ['$productInfo.name', 'Deleted or unknown product']
          },
          barcode: { $ifNull: ['$productInfo.barcode', ''] },
          unitsMoved: 1,
          records: 1,
          movements: 1
        }
      },
      { $sort: { day: 1, unitsMoved: -1, name: 1, id: 1 } }
    ]),

    Sale.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: chartRange
        }
      },
      { $addFields: { chartDay } },
      {
        $group: {
          _id: '$chartDay',
          grossRevenue: { $sum: '$totalAmount' },
          transactions: { $sum: 1 }
        }
      }
    ]),

    SaleReturn.aggregate([
      { $match: { createdAt: chartRange } },
      { $addFields: { chartDay } },
      {
        $group: {
          _id: '$chartDay',
          totalRefund: { $sum: '$totalRefund' }
        }
      }
    ]),

    Sale.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: chartRange
        }
      },
      { $addFields: { chartDay } },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            day: '$chartDay',
            product: '$items.product'
          },
          name: { $first: '$items.name' },
          barcode: { $first: '$items.barcode' },
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.subtotal' }
        }
      },
      {
        $project: {
          _id: 0,
          day: '$_id.day',
          id: '$_id.product',
          name: 1,
          barcode: 1,
          quantitySold: 1,
          revenue: 1
        }
      },
      {
        $sort: {
          day: 1,
          revenue: -1,
          quantitySold: -1,
          name: 1,
          id: 1
        }
      }
    ])
  ]);

  const allTime = allTimeSalesAgg[0] || {};
  const today = todaySalesAgg[0] || {};
  const week = weekSalesAgg[0] || {};

  const allTimeRefunds = numeric(
    allTimeRefundsAgg[0]?.totalRefund
  );
  const todayRefunds = numeric(
    todayRefundsAgg[0]?.totalRefund
  );
  const weekRefunds = numeric(
    weekRefundsAgg[0]?.totalRefund
  );

  const movementsByDay = new Map();
  for (const row of movementProductAgg) {
    const day = numeric(row.day);
    if (!movementsByDay.has(day)) movementsByDay.set(day, []);

    movementsByDay.get(day).push({
      id: row.id,
      name: row.name,
      barcode: row.barcode || '',
      unitsMoved: numeric(row.unitsMoved),
      records: numeric(row.records),
      movements: (row.movements || []).sort((a, b) =>
        String(a.type || '').localeCompare(String(b.type || ''))
      )
    });
  }

  const saleProductsByDay = new Map();
  for (const row of salesProductAgg) {
    const day = numeric(row.day);
    if (!saleProductsByDay.has(day)) saleProductsByDay.set(day, []);

    saleProductsByDay.get(day).push({
      id: row.id,
      name: row.name || 'Unknown product',
      barcode: row.barcode || '',
      quantitySold: numeric(row.quantitySold),
      revenue: numeric(row.revenue)
    });
  }

  const salesByDay = new Map(
    salesByDayAgg.map(row => [numeric(row._id), row])
  );

  const refundsByDay = new Map(
    refundsByDayAgg.map(row => [
      numeric(row._id),
      numeric(row.totalRefund)
    ])
  );

  const weeklyActivity = last7Days.map((day, index) => {
    const dayProducts = movementsByDay.get(index) || [];

    return {
      date: day.date,
      label: day.label,
      fullDate: day.fullDate,
      value: dayProducts.reduce(
        (total, product) => total + product.unitsMoved,
        0
      ),
      movementCount: dayProducts.reduce(
        (total, product) => total + product.records,
        0
      ),
      products: dayProducts
    };
  });

  const salesActivity = last7Days.map((day, index) => {
    const salesRow = salesByDay.get(index) || {};
    const grossRevenue = numeric(salesRow.grossRevenue);
    const refunds = refundsByDay.get(index) || 0;

    return {
      date: day.date,
      label: day.label,
      fullDate: day.fullDate,
      grossRevenue,
      refunds,
      netRevenue: netRevenue(grossRevenue, refunds),
      transactions: numeric(salesRow.transactions),
      products: saleProductsByDay.get(index) || []
    };
  });

  const bestSeller = bestSellerAgg[0]
    ? {
        id: bestSellerAgg[0]._id,
        name: bestSellerAgg[0].name,
        barcode: bestSellerAgg[0].barcode,
        quantitySold: bestSellerAgg[0].quantitySold,
        revenue: bestSellerAgg[0].revenue
      }
    : null;

  res.json({
    totals: {
      products,
      totalStockQuantity: numeric(value[0]?.quantity),
      inventoryValue: numeric(value[0]?.total),
      lowStock,
      outOfStock,
      movementsToday: movementToday,
      activeAlerts: lowStockAlerts,
      expirationAlerts,
      defectiveProducts: defectiveIds.length,

      allTimeRevenue: numeric(allTime.revenue),
      allTimeItemsSold: numeric(allTime.itemsSold),
      allTimeTransactions: numeric(allTime.transactions),

      todayRevenue: numeric(today.revenue),
      todayItemsSold: numeric(today.itemsSold),
      todayTransactions: numeric(today.transactions),

      weekRevenue: numeric(week.revenue),
      weekItemsSold: numeric(week.itemsSold),
      weekTransactions: numeric(week.transactions),

      allTimeRefunds,
      allTimeNetRevenue: netRevenue(
        allTime.revenue,
        allTimeRefunds
      ),

      todayRefunds,
      todayNetRevenue: netRevenue(today.revenue, todayRefunds),

      weekRefunds,
      weekNetRevenue: netRevenue(week.revenue, weekRefunds),

      returnsToday: returnsTodayCount || 0
    },
    movementTypes,
    categoryData,
    bestSeller,
    weeklyActivity,
    salesActivity
  });
}

export async function realtimeStock(req, res) {
  // lean + no Base64 backup: these rows can otherwise carry
  // multi-MB legacy Base64 images.
  const projection = '-legacyBase64Image';

  const [recent, lowStock, outOfStock] = await Promise.all([
    Product.find({ isArchived: false })
      .select(projection)
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('category supplier', 'name')
      .lean(),

    Product.find({
      isArchived: false,
      status: 'low_stock'
    })
      .select(projection)
      .sort({ currentStock: 1 })
      .limit(10)
      .lean(),

    Product.find({
      isArchived: false,
      status: 'out_of_stock'
    })
      .select(projection)
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean()
  ]);

  for (const product of [
    ...recent,
    ...lowStock,
    ...outOfStock
  ]) {
    if (
      typeof product.imageUrl === 'string' &&
      product.imageUrl.startsWith('data:image/')
    ) {
      product.imageUrl = '';
    }
  }

  res.json({ recent, lowStock, outOfStock });
}

export async function getExpirySummary(req, res) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const plus7 = new Date(today);
  plus7.setDate(plus7.getDate() + 7);

  const plus14 = new Date(today);
  plus14.setDate(plus14.getDate() + 14);

  const plus30 = new Date(today);
  plus30.setDate(plus30.getDate() + 30);

  const baseQuery = {
    quantity: { $gt: 0 },
    expirationDate: { $ne: null }
  };

  const { default: ProductBatch } = await import(
    '../models/ProductBatch.js'
  );

  const [count0to7, count8to14, count15to30] =
    await Promise.all([
      ProductBatch.countDocuments({
        ...baseQuery,
        expirationDate: { $gte: today, $lte: plus7 }
      }),

      ProductBatch.countDocuments({
        ...baseQuery,
        expirationDate: { $gt: plus7, $lte: plus14 }
      }),

      ProductBatch.countDocuments({
        ...baseQuery,
        expirationDate: { $gt: plus14, $lte: plus30 }
      })
    ]);

  const urgentBatches = await ProductBatch.find({
    ...baseQuery,
    expirationDate: { $lte: plus7 }
  })
    .populate('product', 'name barcode sku')
    .sort({ expirationDate: 1 })
    .limit(5)
    .lean();

  const rows = urgentBatches.map(batch => {
    const product = batch.product || {};
    const expiration = new Date(batch.expirationDate);
    const daysLeft = Math.ceil(
      (expiration.getTime() - today.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    return {
      batchId: batch._id,
      batchNumber: batch.batchNumber,
      productName: product.name || 'Deleted product',
      barcode: product.barcode || '',
      sku: product.sku || '',
      quantity: batch.quantity,
      expirationDate: batch.expirationDate,
      daysLeft
    };
  });

  res.json({
    summary: {
      within0to7: count0to7,
      within8to14: count8to14,
      within15to30: count15to30
    },
    urgent: rows
  });
}