import mongoose from 'mongoose';

const ItemTranslationSchema = new mongoose.Schema({
  locale: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
}, { _id: false });

const MenuItemSchema = new mongoose.Schema({
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuCategory', required: true },
  price: { type: Number, required: true },
  calories: { type: Number },
  avgWaitMinutes: { type: Number },
  photoUrl: { type: String },
  arFileUrl: { type: String },
  isSoldOut: { type: Boolean, default: false },
  allergenIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Allergen' }],
  translations: [ItemTranslationSchema],
}, { timestamps: true });

export const MenuItem = mongoose.model('MenuItem', MenuItemSchema, 'menu_items');
export { MenuItemSchema, ItemTranslationSchema };
