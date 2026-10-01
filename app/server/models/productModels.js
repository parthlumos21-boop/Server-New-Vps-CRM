const { mongoose } = require('../config/db')
const { Schema } = mongoose

const ProductSchema = new Schema({
  productId: { type: String, required: true, unique: true },
  productName: { type: String, required: true },
  currency: { type: String, default: 'INR' },
  description: { type: String },
  hsn: { type: String },
  productGroup: { type: String },
  unitPrice: { type: Number, default: 0 },
  unitOfMeasure: { type: String },
  taxApplicable: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 }
  },
  productImage: { type: String },
  documentUrl: { type: String },
  active: { type: Boolean, default: true },
  createdBy: { type: String },
  updatedBy: { type: String }
}, { timestamps: true })

ProductSchema.index({ productName: 1 })
ProductSchema.index({ productGroup: 1 })

const ProductSettingSchema = new Schema({
  productGroups: [{ type: String }],
  unitsOfMeasure: [{ type: String }],
  // We only need one settings document usually, so we'll enforce it using a singleton key
  singletonKey: { type: String, default: 'settings', unique: true }
}, { timestamps: true })

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema)
const ProductSetting = mongoose.models.ProductSetting || mongoose.model('ProductSetting', ProductSettingSchema)

module.exports = {
  Product,
  ProductSetting
}
