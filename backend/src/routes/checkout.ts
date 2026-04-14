import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Server as SocketIOServer } from 'socket.io';
import { Order } from '../models/Order';
import { Checkout } from '../models/Checkout';
import { createAppError } from '../middleware/errorHandler';
import { SystemConfig } from '../models/SystemConfig';

export function createCheckoutRouter(io: SocketIOServer): Router {
  const router = Router();

  // POST /api/checkout/table/:tableNumber — Whole table checkout
  router.post('/table/:tableNumber', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tableNumber = parseInt(req.params.tableNumber as string, 10);
      if (isNaN(tableNumber)) {
        throw createAppError('VALIDATION_ERROR', 'Invalid table number');
      }

      const { paymentMethod, cashAmount, cardAmount } = req.body;

      if (!paymentMethod || !['cash', 'card', 'mixed'].includes(paymentMethod)) {
        throw createAppError('VALIDATION_ERROR', 'paymentMethod must be "cash", "card", or "mixed"');
      }

      // Find all pending dine-in orders for this table
      const orders = await Order.find({ type: 'dine_in', tableNumber, status: 'pending' });

      if (orders.length === 0) {
        throw createAppError('NOT_FOUND', 'No pending orders found for this table');
      }

      // Calculate total amount
      const totalAmount = orders.reduce((sum, order) => {
        return sum + order.items.reduce((itemSum, item) => {
          return itemSum + item.unitPrice * item.quantity;
        }, 0);
      }, 0);

      // Validate mixed payment
      if (paymentMethod === 'mixed') {
        if (cashAmount == null || cardAmount == null) {
          throw createAppError('VALIDATION_ERROR', 'cashAmount and cardAmount are required for mixed payment');
        }
        const total = Number(cashAmount) + Number(cardAmount);
        if (Math.abs(total - totalAmount) > 0.001) {
          throw createAppError('PAYMENT_AMOUNT_MISMATCH', 'cashAmount + cardAmount must equal totalAmount', {
            expectedTotal: totalAmount,
            actualTotal: total,
          });
        }
      }

      // Create checkout record
      const checkoutData: Record<string, unknown> = {
        type: 'table',
        tableNumber,
        totalAmount,
        paymentMethod,
        orderIds: orders.map(o => o._id),
      };

      if (paymentMethod === 'mixed') {
        checkoutData.cashAmount = Number(cashAmount);
        checkoutData.cardAmount = Number(cardAmount);
      }

      const checkout = await Checkout.create(checkoutData);

      // Update all orders to checked_out
      await Order.updateMany(
        { _id: { $in: orders.map(o => o._id) } },
        { status: 'checked_out' }
      );

      // Emit Socket.IO event for each order
      for (const order of orders) {
        io.emit('order:checked-out', { orderId: order._id.toString(), tableNumber });
      }

      res.status(201).json(checkout);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/checkout/seat/:orderId — Per-seat checkout
  router.post('/seat/:orderId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = req.params.orderId as string;
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw createAppError('VALIDATION_ERROR', 'Invalid order ID');
      }

      const { paymentMethod, cashAmount, cardAmount } = req.body;

      if (!paymentMethod || !['cash', 'card', 'mixed'].includes(paymentMethod)) {
        throw createAppError('VALIDATION_ERROR', 'paymentMethod must be "cash", "card", or "mixed"');
      }

      const order = await Order.findById(orderId);
      if (!order) {
        throw createAppError('NOT_FOUND', 'Order not found');
      }

      if (order.status !== 'pending') {
        throw createAppError('VALIDATION_ERROR', 'Only pending orders can be checked out', {
          currentStatus: order.status,
        });
      }

      // Calculate total amount
      const totalAmount = order.items.reduce((sum, item) => {
        return sum + item.unitPrice * item.quantity;
      }, 0);

      // Validate mixed payment
      if (paymentMethod === 'mixed') {
        if (cashAmount == null || cardAmount == null) {
          throw createAppError('VALIDATION_ERROR', 'cashAmount and cardAmount are required for mixed payment');
        }
        const total = Number(cashAmount) + Number(cardAmount);
        if (Math.abs(total - totalAmount) > 0.001) {
          throw createAppError('PAYMENT_AMOUNT_MISMATCH', 'cashAmount + cardAmount must equal totalAmount', {
            expectedTotal: totalAmount,
            actualTotal: total,
          });
        }
      }

      // Create checkout record
      const checkoutData: Record<string, unknown> = {
        type: 'seat',
        totalAmount,
        paymentMethod,
        orderIds: [order._id],
      };

      if (order.tableNumber != null) {
        checkoutData.tableNumber = order.tableNumber;
      }

      if (paymentMethod === 'mixed') {
        checkoutData.cashAmount = Number(cashAmount);
        checkoutData.cardAmount = Number(cardAmount);
      }

      const checkout = await Checkout.create(checkoutData);

      // Update order status
      order.status = 'checked_out';
      await order.save();

      // Emit Socket.IO event
      io.emit('order:checked-out', { orderId: order._id.toString(), tableNumber: order.tableNumber });

      res.status(201).json(checkout);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/checkout/receipt/:checkoutId — Get receipt data
  router.get('/receipt/:checkoutId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { checkoutId } = req.params;
      if (!mongoose.Types.ObjectId.isValid(checkoutId as string)) {
        throw createAppError('VALIDATION_ERROR', 'Invalid checkout ID');
      }

      const checkout = await Checkout.findById(checkoutId).lean();
      if (!checkout) {
        throw createAppError('NOT_FOUND', 'Checkout not found');
      }

      // Populate orders with their items
      const orders = await Order.find({ _id: { $in: checkout.orderIds } }).lean();

      res.json({
        checkoutId: checkout._id,
        type: checkout.type,
        tableNumber: checkout.tableNumber,
        totalAmount: checkout.totalAmount,
        paymentMethod: checkout.paymentMethod,
        cashAmount: checkout.cashAmount,
        cardAmount: checkout.cardAmount,
        checkedOutAt: checkout.checkedOutAt,
        orders: orders.map(o => ({
          _id: o._id,
          type: o.type,
          tableNumber: o.tableNumber,
          seatNumber: o.seatNumber,
          dailyOrderNumber: o.dailyOrderNumber,
          status: o.status,
          items: o.items,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
