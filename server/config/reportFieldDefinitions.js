module.exports = {
  account: [
    { id: 'groupType', label: 'Group Type', type: 'string', dbField: 'groupType' },
    { id: 'groupName', label: 'Group Name', type: 'string', dbField: 'groupName' },
    { id: 'companyName', label: 'Company Name', type: 'string', dbField: 'companyName' },
    { id: 'source', label: 'Source', type: 'string', dbField: 'source' },
    { id: 'leadStatus', label: 'Account Status', type: 'string', dbField: 'leadStatus' },
    { id: 'ownerName', label: 'Owner', type: 'string', dbField: 'ownerUserId.name' },
  ]
};
