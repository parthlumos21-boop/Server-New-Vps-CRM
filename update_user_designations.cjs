const fs = require('fs');
const repoPath = 'd:/final crm/server/repositories/userRepository.js';
const ctrlPath = 'd:/final crm/server/controllers/userController.js';
const routePath = 'd:/final crm/server/routes/userRoutes.js';

let repo = fs.readFileSync(repoPath, 'utf8');
const repoFunc = "\nconst getDistinctDesignations = async (companyId = null) => {\n  const query = { status: 'approved' };\n  if (companyId !== null && companyId !== undefined) query.companyId = companyId;\n  const User = require('../models/mongoModels').getMongoModel('users');\n  const designations = await User.distinct('designation', query);\n  return designations.filter(Boolean).map(d => String(d).trim()).filter(d => d.length > 0);\n}\n";
if (!repo.includes('getDistinctDesignations')) {
  repo = repo.replace('module.exports = {', repoFunc + '\nmodule.exports = {\n  getDistinctDesignations,');
  fs.writeFileSync(repoPath, repo);
}

let ctrl = fs.readFileSync(ctrlPath, 'utf8');
const ctrlFunc = "\nconst getDistinctDesignations = async (req, res, next) => {\n  try {\n    const designations = await userRepository.getDistinctDesignations(req.user?.companyId);\n    res.json({ success: true, data: designations });\n  } catch (error) {\n    next(error);\n  }\n}\n";
if (!ctrl.includes('getDistinctDesignations')) {
  ctrl = ctrl.replace('module.exports = {', ctrlFunc + '\nmodule.exports = {\n  getDistinctDesignations,');
  fs.writeFileSync(ctrlPath, ctrl);
}

let routes = fs.readFileSync(routePath, 'utf8');
if (!routes.includes('/designations')) {
  routes = routes.replace('router.use(requireAuth)', "router.use(requireAuth)\n\nrouter.get('/designations', userController.getDistinctDesignations)");
  fs.writeFileSync(routePath, routes);
}
