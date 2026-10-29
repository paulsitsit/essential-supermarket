import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import Sale from '../models/Sale.js';
import SaleReturn from '../models/SaleReturn.js';
import ExpirationAlert from '../models/ExpirationAlert.js';

function numeric(value) {
  return Number(value) || 0;
}

function netRevenue(revenue, refunds) {
  return Math.max(numeric(revenue) - numeric(refunds), 0);
}

/**
 * Return the current database-backed values shown on dashboard cards.
 *
 * Using isArchived: { $ne: true } includes older products where the
 * isArchived field was never written, while excluding explicitly archived
 * products. Stock counts are derived from currentStock/reorderLevel instead
 * of trusting a potentially stale stored status value.
 */
export async function cardTotals(req, res) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const activeProductMatch = {
    isArchived: { $ne: true }
  };

  const [
    productSummaryRows,
    defectiveProductIds,
    movementsToday,
    expirationAlerts,
    allTimeSalesRows,
    todaySalesRows,
    todayRefundRows,
    returnsToday
  ] = await Promise.all([
    Product.aggregate([
      { $match: activeProductMatch },
      {
        $group: {
          _id: null,
          products: { $sum: 1 },
          totalStockQuantity: {
            $sum: { $ifNull: ['$currentStock', 0] }
          },
          inventoryValue: {
            $sum: {
              $multiply: [
                { $ifNull: ['$currentStock', 0] },
                { $ifNull: ['$costPrice', 0] }
              ]
            }
          },
          lowStock: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: [{ $ifNull: ['$currentStock', 0] }, 0] },
                    {
                      $lte: [
                        { $ifNull: ['$currentStock', 0] },
                        { $ifNull: ['$reorderLevel', 10] }
                      ]
                    }
                  ]
                },
                1,
                0
              ]
            }
          },
          outOfStock: {
            $sum: {
              $cond: [
                { $lte: [{ $ifNull: ['$currentStock', 0] }, 0] },
                1,
                0
              ]
            }
          }
        }
      }
    ]),

    // Count distinct products with damage history, not just today's records.
    StockMovement.distinct('product', {
      movementType: 'damaged'
    }),

    StockMovement.countDocuments({
      createdAt: { $gte: startOfDay }
    }),

    ExpirationAlert.countDocuments({
      status: { $ne: 'resolved' }
    }),

    Sale.aggregate([
      { $match: { status: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: null,
          allTimeItemsSold: {
            $sum: { $ifNull: ['$items.quantity', 0] }
          }
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
          todayRevenue: {
            $sum: { $ifNull: ['$totalAmount', 0] }
          }
        }
      }
    ]),

    SaleReturn.aggregate([
      { $match: { createdAt: { $gte: startOfDay } } },
      {
        $group: {
          _id: null,
          todayRefunds: {
            $sum: { $ifNull: ['$totalRefund', 0] }
          }
        }
      }
    ]),

    SaleReturn.countDocuments({
      createdAt: { $gte: startOfDay }
    })
  ]);

  const productSummary = productSummaryRows[0] || {};
  const allTimeSales = allTimeSalesRows[0] || {};
  const todaySales = todaySalesRows[0] || {};
  const todayRefunds = numeric(todayRefundRows[0]?.todayRefunds);
  const todayRevenue = numeric(todaySales.todayRevenue);

  res.json({
    totals: {
      products: numeric(productSummary.products),
      totalStockQuantity: numeric(productSummary.totalStockQuantity),
      inventoryValue: numeric(productSummary.inventoryValue),
      lowStock: numeric(productSummary.lowStock),
      outOfStock: numeric(productSummary.outOfStock),
      expirationAlerts: numeric(expirationAlerts),
      defectiveProducts: defectiveProductIds.length,
      movementsToday: numeric(movementsToday),
      allTimeItemsSold: numeric(allTimeSales.allTimeItemsSold),
      todayRevenue,
      todayRefunds,
      todayNetRevenue: netRevenue(todayRevenue, todayRefunds),
      returnsToday: numeric(returnsToday)
    }
  });
}
