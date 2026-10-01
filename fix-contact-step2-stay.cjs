const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'accounts', 'AddAccountWizard.jsx');

if (!fs.existsSync(filePath)) {
  console.error('Error: AddAccountWizard.jsx file not found at:', filePath);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
let modified = false;

// 1. Upgrade handleStepChange to validate before step advance
const oldStepChange = `const handleStepChange = (targetStep) => {
    setCurrentStep(targetStep)
  }`;

const newStepChange = `const handleStepChange = (targetStep) => {
    if (targetStep > currentStep) {
      if (!validateStep(currentStep)) {
        triggerErrorScroll()
        return
      }
    }
    setCurrentStep(targetStep)
    setValidationNotice([])
  }`;

if (content.includes(oldStepChange)) {
  content = content.replace(oldStepChange, newStepChange);
  modified = true;
  console.log('1. Updated handleStepChange with validation step check.');
}

// 2. Prevent accidental form submission when pressing Enter key inside input fields on contact/basic step
const oldFormTag = `<form
        onSubmit={handleSubmit}
        className="add-account-landscape-form"
      >`;

const newFormTag = `<form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault()
          }
        }}
        className="add-account-landscape-form"
      >`;

if (content.includes(oldFormTag)) {
  content = content.replace(oldFormTag, newFormTag);
  modified = true;
  console.log('2. Added Enter-key submission prevention to form element.');
}

if (modified) {
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('SUCCESS: AddAccountWizard.jsx updated successfully to keep Contact Step 2 displayed and save only on explicit Save click!');
} else {
  console.log('NOTICE: No changes made (file might already have the updates).');
}
