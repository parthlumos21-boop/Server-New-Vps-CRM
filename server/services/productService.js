const { Product, ProductSetting } = require('../models/productModels')
const { AppError } = require('../utils/appError')

class ProductService {
  // --- Settings ---
  async getSettings() {
    let settings = await ProductSetting.findOne({ singletonKey: 'settings' })
    if (!settings) {
      settings = await ProductSetting.create({
        singletonKey: 'settings',
        productGroups: ['ELECTRICAL PANEL', 'BUS DUCT', 'INDUSTRIAL AUTOMATION'],
        unitsOfMeasure: ['Kg', 'Grm', 'PcMtr', 'Sq.Mtr', 'Sq.ft', 'Box', 'Tin', 'Roll', 'Can', 'Set', 'Unit', 'Liter', 'Nos']
      })
    }
    return settings
  }

  async updateSettings(payload) {
    const settings = await ProductSetting.findOneAndUpdate(
      { singletonKey: 'settings' },
      { $set: payload },
      { new: true, upsert: true }
    )
    return settings
  }

  // --- Products ---
  async getProducts(filters = {}) {
    const query = {}
    if (filters.search) {
      query.$or = [
        { productName: { $regex: filters.search, $options: 'i' } },
        { productId: { $regex: filters.search, $options: 'i' } },
        { productGroup: { $regex: filters.search, $options: 'i' } }
      ]
    }
    if (filters.productGroup) {
      query.productGroup = filters.productGroup
    }
    if (filters.active !== undefined) {
      query.active = filters.active === 'true' || filters.active === true
    }

    return await Product.find(query).sort({ createdAt: -1 })
  }

  async getProductById(productId) {
    const product = await Product.findOne({ productId })
    if (!product) {
      throw new AppError('Product not found', 404)
    }
    return product
  }

  async createProduct(payload, user) {
    const existing = await Product.findOne({ productId: payload.productId })
    if (existing) {
      throw new AppError(`Product ID '${payload.productId}' already exists`, 400)
    }

    const product = new Product({
      ...payload,
      createdBy: user?.id,
      updatedBy: user?.id
    })

    await product.save()
    return product
  }

  async updateProduct(productId, payload, user) {
    const product = await Product.findOneAndUpdate(
      { productId },
      { ...payload, updatedBy: user?.id },
      { new: true }
    )

    if (!product) {
      throw new AppError('Product not found', 404)
    }
    return product
  }

  async deleteProduct(productId) {
    const result = await Product.findOneAndDelete({ productId })
    if (!result) {
      throw new AppError('Product not found', 404)
    }
    return { message: 'Product deleted successfully' }
  }
}

module.exports = new ProductService()
