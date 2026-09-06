import {
  getBatchLedger,
  getProductLedger,
  getProductMovements,
  getBatchVariance,
  getProductVariances
} from '../services/stockLedger.service.js';

export async function getBatchLedgerController(req, res, next) {
  try {
    const { batchId } = req.params;
    const { limit, skip, startDate, endDate } = req.query;

    const result = await getBatchLedger(batchId, {
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0,
      startDate,
      endDate
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductLedgerController(req, res, next) {
  try {
    const { productId } = req.params;
    const { limit, skip, startDate, endDate, batchId } = req.query;

    const result = await getProductLedger(productId, {
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0,
      startDate,
      endDate,
      batchId
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductMovementsController(req, res, next) {
  try {
    const { productId } = req.params;
    const { limit, skip, startDate, endDate, movementType } = req.query;

    const result = await getProductMovements(productId, {
      limit: parseInt(limit) || 100,
      skip: parseInt(skip) || 0,
      startDate,
      endDate,
      movementType
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

export async function getBatchVarianceController(req, res, next) {
  try {
    const { batchId } = req.params;

    const variance = await getBatchVariance(batchId);

    res.json({
      success: true,
      data: variance
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductVariancesController(req, res, next) {
  try {
    const { productId } = req.params;

    const variances = await getProductVariances(productId);

    res.json({
      success: true,
      data: {
        productId,
        variances,
        totalVariances: variances.length
      }
    });
  } catch (error) {
    next(error);
  }
}