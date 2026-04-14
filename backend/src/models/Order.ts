import mongoose from 'mongoose';

const OrderItemSubdocSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true },
  itemName: { type: String, required: true },
  selectedOptions: [{
    groupName: { type: String },
    choiceName: { type: String },
    extraPrice: { type: Number, default: 0 },
  }],
}, { _id: true });

const OrderSchema = new mongoose.Schema({
  type: { type: String, enum: ['dine_in', 'takeout'], required: true },
  tableNumber: { type: Number },
  seatNumber: { type: Number },
  dailyOrderNumber: { type: Number },
  status: { type: String, enum: ['pending', 'checked_out', 'completed'], default: 'pending' },
  items: [OrderItemSubdocSchema],
  completedAt: { type: Date },
}, { timestamps: true });

export const Order = mongoose.model('Order', OrderSchema, 'orders');
export { OrderSchema, OrderItemSubdocSchema };
