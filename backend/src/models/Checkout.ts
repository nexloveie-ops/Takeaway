import mongoose from 'mongoose';

const CheckoutSchema = new mongoose.Schema({
  type: { type: String, enum: ['table', 'seat'], required: true },
  tableNumber: { type: Number },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'card', 'mixed'], required: true },
  cashAmount: { type: Number },
  cardAmount: { type: Number },
  orderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  checkedOutAt: { type: Date, default: Date.now },
});

export const Checkout = mongoose.model('Checkout', CheckoutSchema, 'checkouts');
export { CheckoutSchema };
