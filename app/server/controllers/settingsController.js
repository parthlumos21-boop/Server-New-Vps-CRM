const settingsService = require('../services/settingsService')
const { AppError } = require('../utils/appError')

const ok = (res, data) => res.json({ success: true, data })

const listGlobal = async (_req, res, next) => {
  try { ok(res, await settingsService.listGlobal()) } catch (e) { next(e) }
}
const listUser = async (req, res, next) => {
  try { ok(res, await settingsService.listUser(req.user)) } catch (e) { next(e) }
}
const getUserSetting = async (req, res, next) => {
  try { ok(res, await settingsService.getUserSetting(req.user, req.params.key)) } catch (e) { next(e) }
}
const setUserSetting = async (req, res, next) => {
  try {
    if (!req.params.key) throw new AppError('key is required.', 400)
    ok(res, await settingsService.setUserSetting(req.user, req.params.key, req.body?.value))
  } catch (e) { next(e) }
}
const removeUserSetting = async (req, res, next) => {
  try { ok(res, await settingsService.removeUserSetting(req.user, req.params.key)) } catch (e) { next(e) }
}
const setGlobalSetting = async (req, res, next) => {
  try { ok(res, await settingsService.setGlobalSetting(req.user, req.params.key, req.body?.value)) } catch (e) { next(e) }
}
const removeGlobalSetting = async (req, res, next) => {
  try { ok(res, await settingsService.removeGlobalSetting(req.user, req.params.key)) } catch (e) { next(e) }
}
const getSetupStatus = async (req, res, next) => {
  try { ok(res, await settingsService.getSetupStatus(req.user)) } catch (e) { next(e) }
}

module.exports = {
  listGlobal, listUser,
  getUserSetting, setUserSetting, removeUserSetting,
  setGlobalSetting, removeGlobalSetting,
  getSetupStatus,
}
