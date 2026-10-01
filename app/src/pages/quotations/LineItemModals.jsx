import React, { useState, useEffect } from 'react'
import { FaTimes, FaCheckCircle, FaAngleDown } from 'react-icons/fa'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import './LineItemModals.css'

export const AddOtherServiceModal = ({ isOpen, onClose, onAdd }) => {
  const [serviceName, setServiceName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [sac, setSac] = useState('')
  const [description, setDescription] = useState('')
  const [includeTax, setIncludeTax] = useState(true)
  const [cgst, setCgst] = useState('')
  const [sgst, setSgst] = useState('')
  const [igst, setIgst] = useState('')

  useEffect(() => {
    if (isOpen) {
      setServiceName('')
      setQuantity('')
      setUnitPrice('')
      setSac('')
      setDescription('')
      setIncludeTax(true)
      setCgst('')
      setSgst('')
      setIgst('')
    }
  }, [isOpen])

  const handleAdd = () => {
    onAdd({
      type: 'otherService',
      description: serviceName || description || 'Other Service',
      quantity: quantity,
      unit: 'Nos',
      rate: unitPrice,
      hsn_sac: sac,
      cgst,
      sgst,
      igst
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Other Service" size="large">
      <div className="line-item-modal-wrap">
        <div className="line-item-modal-box">
          <div className="line-item-form-group">
            <label className="line-item-form-label">Service Name</label>
            <div className="line-item-form-control">
              <input type="text" className="line-item-form-input" value={serviceName} onChange={e => setServiceName(e.target.value)} />
            </div>
          </div>
          
          <div className="line-item-form-group">
            <label className="line-item-form-label">Quantity</label>
            <div className="line-item-form-control">
              <input type="text" className="line-item-form-input" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
          </div>
          
          <div className="line-item-form-group">
            <label className="line-item-form-label">Unit Price</label>
            <div className="line-item-form-control line-item-form-input-group">
              <span className="line-item-input-prefix">INR</span>
              <input type="text" className="line-item-form-input-prefixed" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
            </div>
          </div>
          
          <div className="line-item-form-group">
            <label className="line-item-form-label">SAC</label>
            <div className="line-item-form-control">
              <input type="text" className="line-item-form-input" value={sac} onChange={e => setSac(e.target.value)} />
            </div>
          </div>
          
          <div className="line-item-form-group" style={{ alignItems: 'flex-start' }}>
            <label className="line-item-form-label" style={{ paddingTop: '0.5rem' }}>Description</label>
            <div className="line-item-form-control">
              <textarea className="line-item-form-input" rows="3" value={description} onChange={e => setDescription(e.target.value)}></textarea>
            </div>
          </div>
          
          <div className="line-item-form-group" style={{ alignItems: 'flex-start' }}>
            <label className="line-item-form-label" style={{ paddingTop: '0.5rem' }}>Tax Applicable</label>
            <div className="line-item-form-control">
              <label className="line-item-checkbox-label">
                <input type="checkbox" checked={includeTax} onChange={e => setIncludeTax(e.target.checked)} />
                Include Tax
              </label>
              
              {includeTax && (
                <div className="line-item-tax-row">
                  <div className="line-item-tax-item">
                    <span>CGST</span>
                    <input type="text" className="line-item-tax-input" value={cgst} onChange={e => setCgst(e.target.value)} /> %
                  </div>
                  <div className="line-item-tax-item">
                    <span>SGST</span>
                    <input type="text" className="line-item-tax-input" value={sgst} onChange={e => setSgst(e.target.value)} /> %
                  </div>
                  <div className="line-item-tax-item">
                    <span>IGST</span>
                    <input type="text" className="line-item-tax-input" value={igst} onChange={e => setIgst(e.target.value)} /> %
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="line-item-modal-footer">
          <Button variant="danger" onClick={onClose}><FaTimes /> Close</Button>
          <Button variant="success" onClick={handleAdd}><FaCheckCircle /> Add To Quote</Button>
        </div>
      </div>
    </Modal>
  )
}

export const AddOtherProductModal = ({ isOpen, onClose, onAdd }) => {
  const [productId, setProductId] = useState('')
  const [productName, setProductName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [uom, setUom] = useState('Select UOM')
  const [unitPrice, setUnitPrice] = useState('')
  const [hsn, setHsn] = useState('')
  const [description, setDescription] = useState('')
  const [addToCatalogue, setAddToCatalogue] = useState(false)
  const [includeTax, setIncludeTax] = useState(true)
  const [cgst, setCgst] = useState('')
  const [sgst, setSgst] = useState('')
  const [igst, setIgst] = useState('')

  useEffect(() => {
    if (isOpen) {
      setProductId('')
      setProductName('')
      setQuantity('')
      setUom('Select UOM')
      setUnitPrice('')
      setHsn('')
      setDescription('')
      setAddToCatalogue(false)
      setIncludeTax(true)
      setCgst('')
      setSgst('')
      setIgst('')
    }
  }, [isOpen])

  const handleAdd = () => {
    onAdd({
      type: 'otherProduct',
      description: productName || description || 'Other Product',
      quantity: quantity,
      unit: uom !== 'Select UOM' ? uom : 'Nos',
      rate: unitPrice,
      hsn_sac: hsn,
      cgst,
      sgst,
      igst
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Other Product" size="large">
      <div className="line-item-modal-wrap">
        <div className="line-item-modal-box">
          <div className="line-item-form-group">
            <label className="line-item-form-label">Product ID <span className="line-item-info-icon">i</span></label>
            <div className="line-item-form-control">
              <input type="text" className="line-item-form-input" value={productId} onChange={e => setProductId(e.target.value)} />
            </div>
          </div>
          
          <div className="line-item-form-group">
            <label className="line-item-form-label">Product Name</label>
            <div className="line-item-form-control">
              <input type="text" className="line-item-form-input" value={productName} onChange={e => setProductName(e.target.value)} />
            </div>
          </div>
          
          <div className="line-item-form-group">
            <label className="line-item-form-label">Quantity</label>
            <div className="line-item-form-control line-item-form-input-group">
              <input type="text" className="line-item-form-input-dropdown" value={quantity} onChange={e => setQuantity(e.target.value)} />
              <select className="line-item-form-select" value={uom} onChange={e => setUom(e.target.value)}>
                <option>Select UOM</option>
                <option>Box</option>
                <option>Can</option>
                <option>Grm</option>
                <option>Kg</option>
                <option>Liter</option>
                <option>Nos</option>
                <option>PcMtr</option>
                <option>Roll</option>
                <option>Set</option>
                <option>Sq.Mtr</option>
                <option>Sq.ft</option>
                <option>Tin</option>
                <option>Unit</option>
                <option>CUSTOM</option>
              </select>
            </div>
          </div>
          
          <div className="line-item-form-group">
            <label className="line-item-form-label">Unit Price</label>
            <div className="line-item-form-control line-item-form-input-group">
              <span className="line-item-input-prefix">INR</span>
              <input type="text" className="line-item-form-input-prefixed" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} />
            </div>
          </div>
          
          <div className="line-item-form-group">
            <label className="line-item-form-label">HSN</label>
            <div className="line-item-form-control">
              <input type="text" className="line-item-form-input" value={hsn} onChange={e => setHsn(e.target.value)} />
            </div>
          </div>
          
          <div className="line-item-form-group" style={{ alignItems: 'flex-start' }}>
            <label className="line-item-form-label" style={{ paddingTop: '0.5rem' }}>Description</label>
            <div className="line-item-form-control">
              <textarea className="line-item-form-input" rows="3" value={description} onChange={e => setDescription(e.target.value)}></textarea>
              <div style={{ textAlign: 'right', marginTop: '0.25rem' }}>
                <a href="#" style={{ color: '#3ca8f0', fontSize: '0.85rem', textDecoration: 'none' }}>Edit Attributes</a>
              </div>
            </div>
          </div>
          
          <div className="line-item-form-group" style={{ alignItems: 'flex-start' }}>
            <label className="line-item-form-label" style={{ paddingTop: '0.5rem' }}>Tax Applicable</label>
            <div className="line-item-form-control">
              <label className="line-item-checkbox-label" style={{ color: '#3ca8f0', fontWeight: 'normal' }}>
                <input type="checkbox" checked={addToCatalogue} onChange={e => setAddToCatalogue(e.target.checked)} />
                Add Product to Catalogue
              </label>
              <label className="line-item-checkbox-label">
                <input type="checkbox" checked={includeTax} onChange={e => setIncludeTax(e.target.checked)} />
                Include Tax
              </label>
              
              {includeTax && (
                <div className="line-item-tax-row">
                  <div className="line-item-tax-item">
                    <span>CGST</span>
                    <input type="text" className="line-item-tax-input" value={cgst} onChange={e => setCgst(e.target.value)} /> %
                  </div>
                  <div className="line-item-tax-item">
                    <span>SGST</span>
                    <input type="text" className="line-item-tax-input" value={sgst} onChange={e => setSgst(e.target.value)} /> %
                  </div>
                  <div className="line-item-tax-item">
                    <span>IGST</span>
                    <input type="text" className="line-item-tax-input" value={igst} onChange={e => setIgst(e.target.value)} /> %
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="line-item-modal-footer">
          <Button variant="danger" onClick={onClose}><FaTimes /> Close</Button>
          <Button variant="success" onClick={handleAdd}><FaCheckCircle /> Add To Quote</Button>
        </div>
      </div>
    </Modal>
  )
}

const mockProducts = [
  { id: 'PLC PANEL', name: 'PLC PANEL', price: '2093000', hsn: '' },
  { id: 'LT PANEL', name: 'LT PANEL', price: '0', hsn: '' },
  { id: 'INDUSTRIAL AUTOMATION', name: 'INDUSTRIAL AUTOMATION', price: '0', hsn: '' },
  { id: 'HT PATEL', name: 'HT PATEL', price: '0', hsn: '' },
  { id: 'HT APFC PANEL', name: 'HT APFC PANEL', price: '3775000', hsn: '' },
  { id: 'HT', name: '1', price: '1', hsn: '' },
  { id: 'BUS DUCT', name: 'BUS DUCT', price: '0', hsn: '' },
  { id: '1', name: 'LT Panel', price: '11446', hsn: '' }
]

export const AddProductModal = ({ isOpen, onClose, onAdd }) => {
  const [showAlert, setShowAlert] = useState(true)
  const [productGroup, setProductGroup] = useState('ELECTRICAL PANEL')

  const handleDoubleClick = (product) => {
    onAdd({
      type: 'product',
      description: product.name,
      quantity: '1',
      unit: 'Nos',
      rate: product.price,
      hsn_sac: product.hsn
    })
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Product" size="large">
      <div className="line-item-modal-wrap">
        {showAlert && (
          <div className="line-item-alert">
            <span><strong>i Note:</strong> Please double click on the product to select a product.</span>
            <span className="line-item-alert-close" onClick={() => setShowAlert(false)}><FaTimes /></span>
          </div>
        )}
        
        <div className="line-item-filter-row">
          <span className="line-item-filter-label">Choose Product Group</span>
          <div style={{ display: 'inline-flex', background: '#3ca8f0', color: 'white', borderRadius: '4px', overflow: 'hidden' }}>
            <span style={{ padding: '0.5rem 1rem' }}>{productGroup}</span>
            <span style={{ padding: '0.5rem', background: '#2986c4', cursor: 'pointer' }}><FaAngleDown /></span>
          </div>
        </div>

        <div className="line-item-table-wrap">
          <table className="line-item-table">
            <thead>
              <tr>
                <th className="sortable">Product Group <FaAngleDown style={{float: 'right', marginTop: '4px', opacity: 0.7}}/></th>
                <th className="sortable">Product Id <FaAngleDown style={{float: 'right', marginTop: '4px', opacity: 0.7}}/></th>
                <th className="sortable">Product Name <FaAngleDown style={{float: 'right', marginTop: '4px', opacity: 0.7}}/></th>
                <th className="sortable">Unit Price <FaAngleDown style={{float: 'right', marginTop: '4px', opacity: 0.7}}/></th>
                <th className="sortable">HSN <FaAngleDown style={{float: 'right', marginTop: '4px', opacity: 0.7}}/></th>
              </tr>
              <tr>
                <th><input type="text" placeholder="Search here ..." className="line-item-table-search" /></th>
                <th><input type="text" placeholder="Search here ..." className="line-item-table-search" /></th>
                <th><input type="text" placeholder="Search here ..." className="line-item-table-search" /></th>
                <th><input type="text" placeholder="Search here ..." className="line-item-table-search" /></th>
                <th><input type="text" placeholder="Search here ..." className="line-item-table-search" /></th>
              </tr>
            </thead>
            <tbody>
              {mockProducts.map((p, i) => (
                <tr key={i} onDoubleClick={() => handleDoubleClick(p)} style={{ cursor: 'pointer' }}>
                  <td>{productGroup}</td>
                  <td>{p.id}</td>
                  <td>{p.name}</td>
                  <td>{p.price}</td>
                  <td>{p.hsn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="line-item-pagination">
          <span style={{ background: '#3ca8f0', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>&#x21ba;</span>
          <span style={{ fontSize: '0.9rem', color: '#555', marginRight: '1rem' }}>Total records: {mockProducts.length}</span>
          <button className="line-item-page-btn">prev</button>
          <button className="line-item-page-btn active">1</button>
          <button className="line-item-page-btn">next</button>
        </div>
        
        <div className="line-item-modal-footer" style={{ marginTop: '1.5rem' }}>
          <Button variant="danger" onClick={onClose}><FaTimes /> Close</Button>
          <Button variant="success" disabled><FaCheckCircle /> Add To Quote</Button>
        </div>
      </div>
    </Modal>
  )
}
