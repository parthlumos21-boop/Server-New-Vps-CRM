const fs = require('fs');
const file = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/pages/admin/charts/ChartsPage.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace CRLF with LF temporarily to match easily
content = content.replace(/\r\n/g, '\n');

const target = `{false ? <>
            {/* Classification Field removed */}
            <select
              id="cc-classification-select"
              className="cc-select"
              value={classificationField}
              onChange={(event) => handleSelectClassificationField(event.target.value)}
            >
              <option value="">Select</option>
              {classificationFieldOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          {classificationField ? (
            <div className="cc-classification-options">
              <div className="cc-classification-options-title">
                Choose the {classificationField} to be listed in the view
              </div>

              <div className="cc-classification-master-row">
                <button
                  type="button"
                  className={\`cc-toggle-pill \${allOn ? 'cc-toggle-pill-on' : 'cc-toggle-pill-off'}\`}
                  onClick={handleToggleAllClassificationOptions}
                >
                  {allOn ? 'ON' : 'OFF'}
                </button>
                <span className="cc-classification-option-label cc-classification-option-label-link">Select all</span>
              </div>

              <div className="cc-classification-options-grid">
                {classificationCurrentOptions.map((option) => {
                  const isOn = Boolean(classificationFieldState[option])
                  return (
                    <div key={option} className="cc-classification-toggle-row">
                      <button
                        type="button"
                        className={\`cc-toggle-pill \${isOn ? 'cc-toggle-pill-on' : 'cc-toggle-pill-off'}\`}
                        onClick={() => handleToggleClassificationOption(option)}
                      >
                        {isOn ? 'ON' : 'OFF'}
                      </button>
                      <span className="cc-classification-option-label">{option}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </> : null}`;

const replacement = `{false ? null : null}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully replaced syntax error block in ChartsPage.jsx');
} else {
  console.log('Target block not found!');
}
