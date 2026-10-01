import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaSearch, FaBox, FaMoneyBillWave } from 'react-icons/fa'
import { MdOutlineKeyboardArrowLeft } from 'react-icons/md'
import Button from '../../components/common/Button'
import { useData } from '../../context/DataContext'
import productApi from '../../services/productApi'
import './ProductCataloguePage.css'

const ProductCataloguePage = () => {
  const navigate = useNavigate()
  const { addNotification } = useData()
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const data = await productApi.getProducts()
      setProducts(data)
    } catch (error) {
      addNotification('error', 'Failed to load products', 'Unable to fetch catalogue.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    try {
      const data = await productApi.getProducts({ search: searchTerm })
      setProducts(data)
    } catch (error) {
      addNotification('error', 'Search failed', 'Could not search products.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="product-catalogue-container">
      <div className="product-catalogue-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MdOutlineKeyboardArrowLeft size={30} style={{ color: '#2980b9', cursor: 'pointer' }} onClick={() => navigate(-1)} />
          <h2>Product Catalogue</h2>
        </div>
        <Button icon={<FaPlus />} onClick={() => navigate('/admin/products/add')}>
          Add Product
        </Button>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search for Product Name, Product Group, Product Id, Unit Price ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button icon={<FaSearch />} onClick={handleSearch}>
          Advanced Search
        </Button>
      </div>

      <div className="product-count-bar">
        Number Of Products {products.length}
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>
      ) : (
        <div className="product-grid">
          {products.map((product) => {
            const initial = product.productName ? product.productName.charAt(0).toUpperCase() : 'P'
            return (
              <div key={product.productId} className="product-card">
                <div className="product-avatar">{initial}</div>
                <div className="product-info">
                  <div className="product-title">{product.productName || product.productId}</div>
                  <div className="product-subtitle">{product.productId}</div>
                  <div className="product-group-label">
                    <FaBox /> {product.productGroup || 'Uncategorized'}
                  </div>
                  <div className="product-price">
                    <FaMoneyBillWave /> {product.currency} {product.unitPrice.toFixed(2)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProductCataloguePage
