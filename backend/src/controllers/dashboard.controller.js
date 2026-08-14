import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import LowStockAlert from '../models/LowStockAlert.js';
import ExpirationAlert from '../models/ExpirationAlert.js';
import Sale from '../models/Sale.js';

export async function summary(req, res) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());

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
    defectiveProducts
  ] = await Promise.all([
    Product.countDocuments({
      isArchived: false
    }),

    Product.countDocuments({
      isArchived: false,
      status: 'low_stock'
    }),

    Product.countDocuments({
      isArchived: false,
      status: 'out_of_stock'
    }),

    StockMovement.countDocuments({
      createdAt: {
        $gte: startOfDay
      }
    }),

    Product.aggregate([
      {
        $match: {
          isArchived: false
        }
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: '$inventoryValue'
          },
          quantity: {
            $sum: '$currentStock'
          }
        }
      }
    ]),

    StockMovement.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfDay
          }
        }
      },
      {
        $group: {
          _id: '$movementType',
          count: {
            $sum: 1
          },
          quantity: {
            $sum: '$quantityChanged'
          }
        }
      },
      {
        $sort: {
          count: -1
        }
      }
    ]),

    Product.aggregate([
      {
        $match: {
          isArchived: false
        }
      },
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
            $ifNull: [
              '$category.name',
              'Uncategorized'
            ]
          },
          quantity: {
            $sum: '$currentStock'
          },
          value: {
            $sum: '$inventoryValue'
          }
        }
      },
      {
        $sort: {
          value: -1
        }
      }
    ]),

    LowStockAlert.countDocuments({
      status: {
        $ne: 'resolved'
      }
    }),

    ExpirationAlert.countDocuments({
      status: {
        $ne: 'resolved'
      }
    }),

    StockMovement.distinct('product', {
      movementType: 'damaged',
      createdAt: { $gte: startOfDay }
    }).then(ids => ids.length)
  ]);

  // Sales metrics (all-time, today, this week)
  const [
    allTimeSalesAgg,
    todaySalesAgg,
    weekSalesAgg
  ] = await Promise.all([
    Sale.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          itemsSold: { $sum: { $sum: '$items.quantity' } },
          transactions: { $sum: 1 }
        }
      }
    ]),

    Sale.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startOfDay }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          itemsSold: { $sum: { $sum: '$items.quantity' } },
          transactions: { $sum: 1 }
        }
      }
    ]),

    Sale.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startOfWeek }
        }
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$totalAmount' },
          itemsSold: { $sum: { $sum: '$items.quantity' } },
          transactions: { $sum: 1 }
        }
      }
    ])
  ]);

  const allTime = allTimeSalesAgg[0] || {
    revenue: 0,
    itemsSold: 0,
    transactions: 0
  };
  const today = todaySalesAgg[0] || {
    revenue: 0,
    itemsSold: 0,
    transactions: 0
  };
  const week = weekSalesAgg[0] || {
    revenue: 0,
    itemsSold: 0,
    transactions: 0
  };

  // Best seller this week (by quantity)
  const bestSellerAgg = await Sale.aggregate([
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
    { $sort: { quantitySold: -1 } },
    { $limit: 1 }
  ]);

  const bestSeller = bestSellerAgg[0]
    ? {
        id: bestSellerAgg[0]._id,
        name: bestSellerAgg[0].name,
        barcode: bestSellerAgg[0].barcode,
        quantitySold: bestSellerAgg[0].quantitySold,
        revenue: bestSellerAgg[0].revenue
      }
    : null;

  // Weekly activity: last 7 days item movement
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfDay);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    last7Days.push({
      date: d,
      label: d.toLocaleDateString('en-PH', {
        weekday: 'short'
      }),
      start: d,
      end: next
    });
  }

  const weeklyActivityAgg = await StockMovement.aggregate([
    {
      $match: {
        createdAt: {
          $gte: last7Days[0].start,
          $lt: last7Days[last7Days.length - 1].end
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        quantity: { $sum: { $abs: '$quantityChanged' } }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  const byDayMap = new Map();
  for (const row of weeklyActivityAgg) {
    const key = `${row._id.year}-${row._id.month}-${row._id.day}`;
    byDayMap.set(key, row.quantity);
  }

  const weeklyActivity = last7Days.map(d => {
    const key = `${d.date.getFullYear()}-${d.date.getMonth() + 1}-${d.date.getDate()}`;
    return {
      label: d.label,
      value: byDayMap.get(key) || 0
    };
  });

  // Sales activity: last 7 days revenue
  const salesByDayAgg = await Sale.aggregate([
    {
      $match: {
        status: 'completed',
        createdAt: {
          $gte: last7Days[0].start,
          $lt: last7Days[last7Days.length - 1].end
        }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        revenue: { $sum: '$totalAmount' },
        transactions: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  const salesByDayMap = new Map();
  for (const row of salesByDayAgg) {
    const key = `${row._id.year}-${row._id.month}-${row._id.day}`;
    salesByDayMap.set(key, row);
  }

  const salesActivity = last7Days.map(d => {
    const key = `${d.date.getFullYear()}-${d.date.getMonth() + 1}-${d.date.getDate()}`;
    const row = salesByDayMap.get(key) || {
      revenue: 0,
      transactions: 0
    };
    return {
      label: d.label,
      revenue: row.revenue || 0,
      transactions: row.transactions || 0
    };
  });

  res.json({
    totals: {
      products,
      totalStockQuantity: value[0]?.quantity || 0,
      inventoryValue: value[0]?.total || 0,
      lowStock,
      outOfStock,
      movementsToday: movementToday,
      activeAlerts: lowStockAlerts,
      expirationAlerts,
      defectiveProducts,

      // Sales totals
      allTimeRevenue: allTime.revenue || 0,
      allTimeItemsSold: allTime.itemsSold || 0,
      allTimeTransactions: allTime.transactions || 0,

      todayRevenue: today.revenue || 0,
      todayItemsSold: today.itemsSold || 0,
      todayTransactions: today.transactions || 0,

      weekRevenue: week.revenue || 0,
      weekItemsSold: week.itemsSold || 0,
      weekTransactions: week.transactions || 0
    },
    movementTypes,
    categoryData,
    bestSeller,
    weeklyActivity,
    salesActivity
  });
}

export async function realtimeStock(req, res) {
  const [recent, lowStock, outOfStock] = await Promise.all([
    Product.find({
      isArchived: false
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .populate('category supplier', 'name'),

    Product.find({
      isArchived: false,
      status: 'low_stock'
    })
      .sort({ currentStock: 1 })
      .limit(10),

    Product.find({
      isArchived: false,
      status: 'out_of_stock'
    })
      .sort({ updatedAt: -1 })
      .limit(10)
  ]);

  res.json({
    recent,
    lowStock,
    outOfStock
  });
}