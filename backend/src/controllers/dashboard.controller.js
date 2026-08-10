import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import LowStockAlert from '../models/LowStockAlert.js';
import ExpirationAlert from '../models/ExpirationAlert.js';

export async function summary(req, res) {
  const start = new Date();

  start.setHours(0, 0, 0, 0);

  const [
    products,
    lowStock,
    outOfStock,
    movementToday,
    value,
    movementTypes,
    categoryData,
    lowStockAlerts,
    expirationAlerts
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
        $gte: start
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
            $gte: start
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
    })
  ]);

  res.json({
    totals: {
      products,
      totalStockQuantity:
        value[0]?.quantity || 0,
      inventoryValue:
        value[0]?.total || 0,
      lowStock,
      outOfStock,
      movementsToday: movementToday,
      activeAlerts: lowStockAlerts,
      expirationAlerts
    },
    movementTypes,
    categoryData
  });
}

export async function realtimeStock(req, res) {
  const [
    recent,
    lowStock,
    outOfStock
  ] = await Promise.all([
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