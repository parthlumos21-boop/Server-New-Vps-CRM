const searchService = require('../services/searchService')

const search = async (req, res, next) => {
  try {
    const data = await searchService.globalSearch(req.user, req.query.q)
    res.json({ success: true, data })
  } catch (error) { next(error) }
}

module.exports = { search }
