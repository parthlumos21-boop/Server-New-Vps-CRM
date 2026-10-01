import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaSave, FaTimes, FaInfoCircle } from 'react-icons/fa'
import Button from '../../components/common/Button'
import { useData } from '../../context/DataContext'
import productApi from '../../services/productApi'
import './AddProductPage.css'

const AddProductPage = () => {
  const navigate = useNavigate()
  const { addNotification } = useData()
  
  const [productGroups, setProductGroups] = useState([])
  const [unitsOfMeasure, setUnitsOfMeasure] = useState([])
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    productId: '',
    productName: '',
    currency: 'INR',
    description: '',
    hsn: '',
    productGroup: '',
    unitPrice: '',
    unitOfMeasure: '',
    cgst: '',
    sgst: '',
    igst: ''
  })

  useEffect(() => {
    productApi.getSettings().then(settings => {
      setProductGroups(settings.productGroups || [])
      setUnitsOfMeasure(settings.unitsOfMeasure || [])
    }).catch(console.error)
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    if (!formData.productId || !formData.productName) {
      addNotification('error', 'Validation Failed', 'Product ID and Name are required.')
      return
    }

    setIsSaving(true)
    try {
      await productApi.createProduct({
        ...formData,
        unitPrice: Number(formData.unitPrice) || 0,
        taxApplicable: {
          cgst: Number(formData.cgst) || 0,
          sgst: Number(formData.sgst) || 0,
          igst: Number(formData.igst) || 0
        }
      })
      addNotification('success', 'Product Created', 'Product has been added to catalogue.')
      navigate('/admin/products')
    } catch (error) {
      addNotification('error', 'Failed to create product', error?.response?.data?.message || 'Could not save product.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="add-product-container">
      <div className="add-product-header">
        <h2>Add Product</h2>
        <div className="add-product-actions">
          <Button icon={<FaSave />} onClick={handleSave} loading={isSaving}>Add</Button>
          <Button variant="outline" icon={<FaTimes />} onClick={() => navigate('/admin/products')}>Cancel</Button>
        </div>
      </div>

      <div className="add-product-form">
        <div className="form-grid">
          {/* Left Column */}
          <div>
            <div className="form-group">
              <label>Product ID <FaInfoCircle color="#3498db" size={12} /></label>
              <input type="text" name="productId" value={formData.productId} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Product Name</label>
              <input type="text" name="productName" value={formData.productName} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select name="currency" value={formData.currency} onChange={handleChange}>
                <option value="Select">Select</option>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="form-group">
              <label>Product Description</label>
              <textarea name="description" rows={4} value={formData.description} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ alignItems: 'flex-start' }}>
              <label style={{ paddingTop: '8px' }}>Document</label>
              <div style={{ flex: 1 }}>
                <input type="file" />
                <div className="file-upload-info" style={{ marginLeft: 0 }}>
                  Note: Max file size is 5 MB<br />
                  File in Word, Text, Outlook, Excel, PPT, Image or PDF format can be uploaded.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            <div className="form-group">
              <label>HSN</label>
              <input type="text" name="hsn" value={formData.hsn} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Product Group</label>
              <select name="productGroup" value={formData.productGroup} onChange={handleChange}>
                <option value="">Select</option>
                {productGroups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Unit Price</label>
              <input type="number" name="unitPrice" value={formData.unitPrice} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Unit of Measure</label>
              <select name="unitOfMeasure" value={formData.unitOfMeasure} onChange={handleChange}>
                <option value="">Select</option>
                {unitsOfMeasure.map(uom => (
                  <option key={uom} value={uom}>{uom}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tax Applicable</label>
              <div className="tax-group">
                <label className="tax-item"><input type="checkbox" /> CGST <input type="number" name="cgst" value={formData.cgst} onChange={handleChange} />%</label>
                <label className="tax-item"><input type="checkbox" /> SGST <input type="number" name="sgst" value={formData.sgst} onChange={handleChange} />%</label>
                <label className="tax-item"><input type="checkbox" /> IGST <input type="number" name="igst" value={formData.igst} onChange={handleChange} />%</label>
              </div>
            </div>
            <div className="form-group" style={{ alignItems: 'flex-start' }}>
              <label style={{ paddingTop: '8px' }}>Product Image</label>
              <div style={{ flex: 1 }}>
                <Button variant="outline" size="small">Choose, Resize & Crop</Button>
                <div className="file-upload-info" style={{ marginLeft: 0 }}>
                  Note: Max file size allowed is 5 MB.<br />
                  Supported image format are 'jpg', 'jpeg', or 'png'
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="section-title">
          Slab Based Discounts <FaInfoCircle size={14} />
          <Button size="small" style={{ float: 'right', background: '#a5d6a7', color: 'white', border: 'none' }}>Add Slab</Button>
        </div>
        <hr style={{ borderTop: '1px solid #ddd', margin: '15px 0' }} />
      </div>
    </div>
  )
}

export default AddProductPage
