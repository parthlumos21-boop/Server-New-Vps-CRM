const fs = require('fs');

// 1. AddReminderModal.jsx
const modalPath = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/components/common/AddReminderModal.jsx';
let modalContent = fs.readFileSync(modalPath, 'utf8').replace(/\r\n/g, '\n');

const modalPropAnchor = `const AddReminderModal = ({
  isOpen,
  onClose,
  contextLabel = '',
  createdBy = '',
  onSaved,
  relatedEntityType,
  relatedEntityId,
  assignedTo,
}) => {`;

const modalPropReplacement = `const AddReminderModal = ({
  isOpen,
  onClose,
  contextLabel = '',
  createdBy = '',
  onSaved,
  relatedEntityType: initialRelatedEntityType,
  relatedEntityId: initialRelatedEntityId,
  assignedTo,
  showEntitySelector = false,
}) => {`;

if (modalContent.includes(modalPropAnchor)) {
  modalContent = modalContent.replace(modalPropAnchor, modalPropReplacement);
}

const modalStateAnchor = `const { user } = useAuth()
  const { createReminder, createTask, addNotification } = useData()
  const [form, setForm] = useState(getInitialFormState)
  const [saving, setSaving] = useState(false)`;

const modalStateReplacement = `const { user } = useAuth()
  const { accounts = [], deals = [], createReminder, createTask, addNotification } = useData()
  const [form, setForm] = useState(getInitialFormState)
  const [saving, setSaving] = useState(false)
  const [entityType, setEntityType] = useState('account')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedDealId, setSelectedDealId] = useState('')`;

if (modalContent.includes(modalStateAnchor)) {
  modalContent = modalContent.replace(modalStateAnchor, modalStateReplacement);
}

// Payload modification
const payloadAnchor = `const reminderTime = form.reminderTime || '09:00'
    const remindAt = \`\${form.reminderDate}T\${reminderTime}:00\`
    const finalAssignedTo = assignedTo || user?.id

    const reminderPayload = {
      title: form.title.trim(),
      message: form.note.trim(),
      remindAt,
      status: 'scheduled',
      reminderDate: form.reminderDate,
      reminderTime,
      reminderMode: form.reminderMode,
      assignedTo: finalAssignedTo,
      ...(relatedEntityType && { relatedEntityType }),
      ...(relatedEntityId && { relatedEntityId }),
    }`;

const payloadReplacement = `const reminderTime = form.reminderTime || '09:00'
    const remindAt = \`\${form.reminderDate}T\${reminderTime}:00\`
    const finalAssignedTo = assignedTo || user?.id

    let finalRelatedEntityType = initialRelatedEntityType
    let finalRelatedEntityId = initialRelatedEntityId
    let extraMeta = {}

    if (showEntitySelector) {
      if (entityType === 'account') {
        if (!selectedAccountId) {
          alert('Please select an Account.')
          setSaving(false)
          return
        }
        const acc = accounts.find((a) => String(a.id || a._id) === String(selectedAccountId))
        finalRelatedEntityType = 'account'
        finalRelatedEntityId = selectedAccountId
        extraMeta = {
          accountId: selectedAccountId,
          accountName: acc?.name || acc?.accountName || acc?.companyName || '',
          accountNumber: acc?.accountNumber || acc?.accountNo || '',
        }
      } else if (entityType === 'deal') {
        if (!selectedDealId) {
          alert('Please select a Deal.')
          setSaving(false)
          return
        }
        const deal = deals.find((d) => String(d.id || d._id) === String(selectedDealId))
        finalRelatedEntityType = 'deal'
        finalRelatedEntityId = selectedDealId
        extraMeta = {
          dealId: selectedDealId,
          dealName: deal?.name || deal?.title || deal?.dealName || '',
          dealNumber: deal?.dealNumber || deal?.dealNo || '',
          accountId: deal?.accountId || '',
          accountName: deal?.accountName || '',
        }
      }
    }

    const reminderPayload = {
      title: form.title.trim(),
      message: form.note.trim(),
      remindAt,
      status: 'scheduled',
      reminderDate: form.reminderDate,
      reminderTime,
      reminderMode: form.reminderMode,
      assignedTo: finalAssignedTo,
      ...(finalRelatedEntityType && { relatedEntityType: finalRelatedEntityType }),
      ...(finalRelatedEntityId && { relatedEntityId: finalRelatedEntityId }),
      ...extraMeta,
    }`;

if (modalContent.includes(payloadAnchor)) {
  modalContent = modalContent.replace(payloadAnchor, payloadReplacement);
}

// Form JSX addition for showEntitySelector
const formJsxAnchor = `<form className="arm-body" onSubmit={handleSubmit} id="add-reminder-form">`;

const formJsxReplacement = `<form className="arm-body" onSubmit={handleSubmit} id="add-reminder-form">
          {showEntitySelector && (
            <div className="arm-section arm-entity-selector-box" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', marginBottom: '14px' }}>
              <label className="arm-label" style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Select Entity Context *</label>
              <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
                  <input
                    type="radio"
                    name="armEntityTypeRadio"
                    value="account"
                    checked={entityType === 'account'}
                    onChange={() => { setEntityType('account'); setSelectedDealId(''); }}
                  />
                  Account (Leads Collection)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: '#1e293b' }}>
                  <input
                    type="radio"
                    name="armEntityTypeRadio"
                    value="deal"
                    checked={entityType === 'deal'}
                    onChange={() => { setEntityType('deal'); setSelectedAccountId(''); }}
                  />
                  Deal (Deals Collection)
                </label>
              </div>

              {entityType === 'account' && (
                <div>
                  <label className="arm-label" htmlFor="arm-select-account">Select Account *</label>
                  <select
                    id="arm-select-account"
                    className="arm-mode-select"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Account --</option>
                    {accounts.map((acc) => (
                      <option key={acc.id || acc._id} value={acc.id || acc._id}>
                        {acc.name || acc.accountName || acc.companyName || 'Account'} {acc.accountNumber || acc.accountNo ? \`(\${acc.accountNumber || acc.accountNo})\` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {entityType === 'deal' && (
                <div>
                  <label className="arm-label" htmlFor="arm-select-deal">Select Deal *</label>
                  <select
                    id="arm-select-deal"
                    className="arm-mode-select"
                    value={selectedDealId}
                    onChange={(e) => setSelectedDealId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Deal --</option>
                    {deals.map((deal) => (
                      <option key={deal.id || deal._id} value={deal.id || deal._id}>
                        {deal.name || deal.title || deal.dealName || 'Deal'} {deal.dealNumber || deal.dealNo ? \`(\${deal.dealNumber || deal.dealNo})\` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}`;

if (modalContent.includes(formJsxAnchor)) {
  modalContent = modalContent.replace(formJsxAnchor, formJsxReplacement);
}

fs.writeFileSync(modalPath, modalContent, 'utf8');
console.log('Updated AddReminderModal.jsx');

// 2. userSidebarConfig.js
const userConfigPath = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/config/userSidebarConfig.js';
let userConfigContent = fs.readFileSync(userConfigPath, 'utf8').replace(/\r\n/g, '\n');

const userRemindersAnchor = `  {
    key: 'reminders',
    label: 'Reminders',
    icon: FaBell,
    routePrefix: '/reminders',
    items: [
      { label: 'My Reminders', to: '/reminders/my' },`;

const userRemindersReplacement = `  {
    key: 'reminders',
    label: 'Reminders',
    icon: FaBell,
    routePrefix: '/reminders',
    items: [
      { label: 'Add Reminder', to: '/reminders/my?add=true', isAddAction: true },
      { label: 'My Reminders', to: '/reminders/my' },`;

if (userConfigContent.includes(userRemindersAnchor)) {
  userConfigContent = userConfigContent.replace(userRemindersAnchor, userRemindersReplacement);
  fs.writeFileSync(userConfigPath, userConfigContent, 'utf8');
  console.log('Updated userSidebarConfig.js');
}

// 3. Sidebar.jsx
const sidebarPath = 'c:/Users/DELL/OneDrive - Lumos/Desktop/Server-New-Vps-CRM/src/components/layout/Sidebar.jsx';
let sidebarContent = fs.readFileSync(sidebarPath, 'utf8').replace(/\r\n/g, '\n');

// Import AddReminderModal in Sidebar.jsx
if (!sidebarContent.includes("import AddReminderModal from '../common/AddReminderModal'")) {
  sidebarContent = sidebarContent.replace(
    "import { customerService } from '../../services/customerService'",
    "import { customerService } from '../../services/customerService'\nimport AddReminderModal from '../common/AddReminderModal'"
  );
}

// Add SubLink onClick support
sidebarContent = sidebarContent.replace(
  `const SubLink = ({ to, label, accent, end, isActiveMatch }) => (`,
  `const SubLink = ({ to, label, accent, end, isActiveMatch, onClick }) => (`
);
sidebarContent = sidebarContent.replace(
  `    title={label}\n    className=`,
  `    title={label}\n    onClick={onClick}\n    className=`
);

// Add state for sidebar AddReminderModal
sidebarContent = sidebarContent.replace(
  `const Sidebar = ({ isAdmin = false }) => {`,
  `const Sidebar = ({ isAdmin = false }) => {\n  const [isSidebarReminderModalOpen, setIsSidebarReminderModalOpen] = useState(false)`
);

// Admin remindersMenuItems
const adminRemindersAnchor = `const remindersMenuItems = [
    { label: 'My Reminders', to: '/admin/reminders/my' },`;

const adminRemindersReplacement = `const remindersMenuItems = [
    { label: 'Add Reminder', to: '/admin/reminders/my?add=true', isAddAction: true },
    { label: 'My Reminders', to: '/admin/reminders/my' },`;

if (sidebarContent.includes(adminRemindersAnchor)) {
  sidebarContent = sidebarContent.replace(adminRemindersAnchor, adminRemindersReplacement);
}

// Admin SubLink rendering for reminders
const adminSubLinkAnchor = `{remindersMenuItems.map((item) => (
              <SubLink key={item.label} to={item.to} label={item.label} />
            ))}`;

const adminSubLinkReplacement = `{remindersMenuItems.map((item) => (
              <SubLink
                key={item.label}
                to={item.to}
                label={item.label}
                onClick={item.isAddAction ? (e) => { e.preventDefault(); setIsSidebarReminderModalOpen(true); } : undefined}
              />
            ))}`;

if (sidebarContent.includes(adminSubLinkAnchor)) {
  sidebarContent = sidebarContent.replace(adminSubLinkAnchor, adminSubLinkReplacement);
}

// Non-admin SubLink rendering for reminders
const userSubLinkAnchor = `<SidebarGroup
              icon={<FaBell />}
              label="Reminders"
              isActive={isUserRemindersRoute}
              isOpen={userRemindersOpen && !isSidebarCollapsed}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setUserRemindersOpen(!userRemindersOpen)}
            >
              <SubLink to="/reminders/my" label="My Reminders" />
              <SubLink to="/reminders/active" label="Active Reminders" />
              <SubLink to="/reminders/closed" label="Closed Reminders" />
            </SidebarGroup>`;

const userSubLinkReplacement = `<SidebarGroup
              icon={<FaBell />}
              label="Reminders"
              isActive={isUserRemindersRoute}
              isOpen={userRemindersOpen && !isSidebarCollapsed}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setUserRemindersOpen(!userRemindersOpen)}
            >
              <SubLink
                to="/reminders/my?add=true"
                label="Add Reminder"
                onClick={(e) => { e.preventDefault(); setIsSidebarReminderModalOpen(true); }}
              />
              <SubLink to="/reminders/my" label="My Reminders" />
              <SubLink to="/reminders/active" label="Active Reminders" />
              <SubLink to="/reminders/closed" label="Closed Reminders" />
            </SidebarGroup>`;

if (sidebarContent.includes(userSubLinkAnchor)) {
  sidebarContent = sidebarContent.replace(userSubLinkAnchor, userSubLinkReplacement);
}

// Add <AddReminderModal> rendering at end of Sidebar.jsx before </aside>
const sidebarEndAnchor = `</aside>\n  )`;
const sidebarEndReplacement = `<AddReminderModal
        isOpen={isSidebarReminderModalOpen}
        onClose={() => setIsSidebarReminderModalOpen(false)}
        showEntitySelector={true}
      />
    </aside>
  )`;

if (sidebarContent.includes(sidebarEndAnchor)) {
  sidebarContent = sidebarContent.replace(sidebarEndAnchor, sidebarEndReplacement);
}

fs.writeFileSync(sidebarPath, sidebarContent, 'utf8');
console.log('Updated Sidebar.jsx');
