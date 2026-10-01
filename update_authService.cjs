const fs = require('fs');
const filePath = 'd:/final crm/src/services/authService.js';
let content = fs.readFileSync(filePath, 'utf8');

const func = "\n  async getDesignations() {\n    const { data } = await apiClient.get('/users/designations')\n    return data?.data || []\n  }\n";

if (!content.includes('getDesignations()')) {
  content = content.replace('export const authService = new AuthService()', func + '\nexport const authService = new AuthService()');
  fs.writeFileSync(filePath, content);
}
