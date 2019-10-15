import { controllerMethodWrapper } from './controllerMethodWrapper'

const CONTROLLER_NAME = 'wallets'

export const updateWallet = controllerMethodWrapper(CONTROLLER_NAME)(
  controller => (params: Controller.UpdateWalletParams) => controller.update(params)
)

export const getCurrentWallet = controllerMethodWrapper(CONTROLLER_NAME)(controller => () => controller.getCurrent())

export const getWalletList = controllerMethodWrapper(CONTROLLER_NAME)(controller => () => controller.getAll())

export const createWallet = controllerMethodWrapper(CONTROLLER_NAME)(
  controller => (params: Controller.CreateWalletParams) => controller.create(params)
)

export const importMnemonic = controllerMethodWrapper(CONTROLLER_NAME)(
  controller => (params: Controller.ImportMnemonicParams) => controller.importMnemonic(params)
)

export const importKeystore = controllerMethodWrapper(CONTROLLER_NAME)(
  controller => (params: Controller.ImportKeystoreParams) => controller.importKeystore(params)
)

export const deleteWallet = controllerMethodWrapper(CONTROLLER_NAME)(
  controller => (params: Controller.DeleteWalletParams) => controller.delete(params)
)

export const backupWallet = controllerMethodWrapper(CONTROLLER_NAME)(
  controller => (params: Controller.DeleteWalletParams) => controller.backup(params)
)

export const setCurrentWallet = controllerMethodWrapper(CONTROLLER_NAME)(
  controller => (id: Controller.SetCurrentWalletParams) => controller.activate(id)
)

export default {
  updateWallet,
  getWalletList,
  createWallet,
  importMnemonic,
  importKeystore,
  deleteWallet,
  backupWallet,
  getCurrentWallet,
}
