const mongoose = require('mongoose')
const logger = require('../utils/logger')

exports.listCollections = async (req, res, next) => {
  try {
    const db = mongoose.connection.db
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database connection not ready' })
    }

    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((col) => col.name).sort()

    // Get count for each collection
    const collectionStats = await Promise.all(
      collectionNames.map(async (name) => {
        try {
          const count = await db.collection(name).countDocuments()
          return { name, count }
        } catch (error) {
          return { name, count: 0, error: 'Failed to get count' }
        }
      })
    )

    res.json({
      success: true,
      data: collectionStats,
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to list collections')
    next(error)
  }
}

exports.getCollectionData = async (req, res, next) => {
  try {
    const { collection } = req.params
    const page = parseInt(req.query.page, 10) || 1
    const limit = parseInt(req.query.limit, 10) || 50
    const skip = (page - 1) * limit

    const db = mongoose.connection.db
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database connection not ready' })
    }

    const col = db.collection(collection)
    
    // Sort by _id descending to show newest first by default
    const cursor = col.find({}).sort({ _id: -1 }).skip(skip).limit(limit)
    const documents = await cursor.toArray()
    const totalCount = await col.countDocuments()

    res.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    })
  } catch (error) {
    logger.error({ err: error, collection: req.params.collection }, 'Failed to get collection data')
    next(error)
  }
}

exports.deleteDocument = async (req, res, next) => {
  try {
    const { collection, id } = req.params

    const db = mongoose.connection.db
    if (!db) {
      return res.status(500).json({ success: false, message: 'Database connection not ready' })
    }

    let objectId
    try {
      objectId = new mongoose.Types.ObjectId(id)
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid document ID format' })
    }

    const col = db.collection(collection)
    const result = await col.deleteOne({ _id: objectId })

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' })
    }

    res.json({
      success: true,
      message: 'Document deleted successfully',
    })
  } catch (error) {
    logger.error({ err: error, collection: req.params.collection, id: req.params.id }, 'Failed to delete document')
    next(error)
  }
}
