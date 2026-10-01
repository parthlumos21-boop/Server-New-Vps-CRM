const productService = require('../services/productService')

class ProductController {
  // --- Settings ---
  async getSettings(req, res, next) {
    try {
      const settings = await productService.getSettings()
      res.json({ success: true, data: settings })
    } catch (error) {
      next(error)
    }
  }

  async updateSettings(req, res, next) {
    try {
      const settings = await productService.updateSettings(req.body)
      res.json({ success: true, data: settings })
    } catch (error) {
      next(error)
    }
  }

  // --- Products ---
  async getProducts(req, res, next) {
    try {
      const filters = req.query
      const products = await productService.getProducts(filters)
      res.json({ success: true, data: products })
    } catch (error) {
      next(error)
    }
  }

  async getProductById(req, res, next) {
    try {
      const product = await productService.getProductById(req.params.id)
      res.json({ success: true, data: product })
    } catch (error) {
      next(error)
    }
  }

  async createProduct(req, res, next) {
    try {
      const product = await productService.createProduct(req.body, req.user)
      res.status(201).json({ success: true, data: product })
    } catch (error) {
      next(error)
    }
  }

  async updateProduct(req, res, next) {
    try {
      const product = await productService.updateProduct(req.params.id, req.body, req.user)
      res.json({ success: true, data: product })
    } catch (error) {
      next(error)
    }
  }

  async deleteProduct(req, res, next) {
    try {
      const result = await productService.deleteProduct(req.params.id)
      res.json({ success: true, data: result })
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new ProductController()
