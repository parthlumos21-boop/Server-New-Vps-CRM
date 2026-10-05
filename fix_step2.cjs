const fs = require('fs');
const file = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/pages/admin/charts/ChartsPage.jsx';
let content = fs.readFileSync(file, 'utf8');

const startIdx = content.indexOf('const renderStep2 = () => {');
const endIdx = content.indexOf('const renderStep3 = () => (');

if (startIdx !== -1 && endIdx !== -1) {
  const newRenderStep2 = `const renderStep2 = () => {
    return (
      <div className="cc-body cc-body-step2">
        <div className="cc-summary-grid">
          <div className="cc-summary-row">
            <span className="cc-summary-label">Context</span>
            <span className="cc-summary-value">{selectedContext}</span>
          </div>
          <div className="cc-summary-row">
            <span className="cc-summary-label">Chart Type</span>
            <span className="cc-summary-value">{selectedChartType || '-'}</span>
          </div>
          <div className="cc-summary-row">
            <label className="cc-summary-label" htmlFor="cc-title-input">
              Title <FaInfoCircle className="cc-info-icon" title="Chart title shown on dashboard" />
            </label>
            <input
              id="cc-title-input"
              type="text"
              className="cc-input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter Title"
            />
          </div>
          <div className="cc-summary-row">
            <label className="cc-summary-label" htmlFor="cc-description-input">Description</label>
            <textarea
              id="cc-description-input"
              className="cc-textarea"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>
    )
  }

  `;

  content = content.substring(0, startIdx) + newRenderStep2 + content.substring(endIdx);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully fixed renderStep2');
} else {
  console.log('Indices not found', { startIdx, endIdx });
}
