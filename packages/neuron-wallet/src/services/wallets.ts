import { v4 as uuid } from 'uuid'
import { debounceTime } from 'rxjs/operators'
import { AccountExtendedPublicKey } from 'models/keys/key'
import Keystore from 'models/keys/keystore'
import Store from 'models/store'
import { WalletNotFound, IsRequired, UsedName } from 'exceptions'
import { Address as AddressInterface } from 'database/address/dao'
import AddressDbChangedSubject from 'models/subjects/address-db-changed-subject'
import { WalletListSubject, CurrentWalletSubject } from 'models/subjects/wallets'
import dataUpdateSubject from 'models/subjects/data-update'
import CommandSubject from 'models/subjects/command'
import WindowManager from 'models/window-manager'

import FileService from './file'
import AddressService from './addresses'

const fileService = FileService.getInstance()

const MODULE_NAME = 'wallets'
const DEBOUNCE_TIME = 200

export interface Wallet {
  id: string
  name: string

  loadKeystore: () => Keystore
  accountExtendedPublicKey: () => AccountExtendedPublicKey
}

export interface WalletProperties {
  id: string
  name: string
  extendedKey: string // Serialized account extended public key
  keystore?: Keystore
}

export class FileKeystoreWallet implements Wallet {
  public id: string
  public name: string
  private extendedKey: string = ''

  constructor(props: WalletProperties) {
    const { id, name, extendedKey } = props

    if (id === undefined) {
      throw new IsRequired('ID')
    }
    if (name === undefined) {
      throw new IsRequired('Name')
    }

    this.id = id
    this.name = name
    this.extendedKey = extendedKey
  }

  accountExtendedPublicKey = (): AccountExtendedPublicKey => {
    return AccountExtendedPublicKey.parse(this.extendedKey) as AccountExtendedPublicKey
  }

  static fromJSON = (json: WalletProperties) => {
    return new FileKeystoreWallet(json)
  }

  public update = ({ name }: { name: string }) => {
    if (name) {
      this.name = name
    }
  }

  public toJSON = () => {
    return {
      id: this.id,
      name: this.name,
      extendedKey: this.extendedKey,
    }
  }

  public loadKeystore = () => {
    const data = fileService.readFileSync(MODULE_NAME, this.keystoreFileName())
    return Keystore.fromJson(data)
  }

  saveKeystore = (keystore: Keystore) => {
    fileService.writeFileSync(MODULE_NAME, this.keystoreFileName(), JSON.stringify({ ...keystore, id: this.id }))
  }

  deleteKeystore = () => {
    fileService.deleteFileSync(MODULE_NAME, this.keystoreFileName())
  }

  keystoreFileName = () => {
    return `${this.id}.json`
  }
}

export default class WalletService {
  private static instance: WalletService
  private listStore: Store // Save wallets (meta info except keystore, which is persisted separately)
  private walletsKey = 'wallets'
  private currentWalletKey = 'current'

  public static getInstance = () => {
    if (!WalletService.instance) {
      WalletService.instance = new WalletService()
    }
    return WalletService.instance
  }

  constructor() {
    this.listStore = new Store(MODULE_NAME, 'wallets.json')

    this.listStore.on(
      this.walletsKey,
      (prevWalletList: WalletProperties[] = [], currentWalletList: WalletProperties[] = []) => {
        const currentWallet = this.getCurrent()
        WalletListSubject.next({ currentWallet, prevWalletList, currentWalletList })
      }
    )
    this.listStore.on(this.currentWalletKey, (_prevId: string | undefined, currentID: string | undefined) => {
      if (undefined === currentID) {
        return
      }
      const currentWallet = this.getCurrent() || null
      const walletList = this.getAll()
      CurrentWalletSubject.next({
        currentWallet,
        walletList,
      })
    })

    AddressDbChangedSubject.getSubject()
      .pipe(debounceTime(DEBOUNCE_TIME))
      .subscribe(() => {
        dataUpdateSubject.next({
          dataType: 'address',
          actionType: 'update',
        })
      })
  }

  public getAll = (): WalletProperties[] => {
    return this.listStore.readSync(this.walletsKey) || []
  }

  public get = (id: string): Wallet => {
    if (id === undefined) {
      throw new IsRequired('ID')
    }

    const wallet = this.getAll().find(w => w.id === id)
    if (!wallet) {
      throw new WalletNotFound(id)
    }

    return FileKeystoreWallet.fromJSON(wallet)
  }

  public generateAddressesById = async (id: string, isImporting: boolean) => {
    const wallet: Wallet = this.get(id)
    const accountExtendedPublicKey: AccountExtendedPublicKey = wallet.accountExtendedPublicKey()
    await AddressService.generateAndSave(
      id,
      accountExtendedPublicKey,
      isImporting
    )
  }

  public create = (props: WalletProperties) => {
    if (!props) {
      throw new IsRequired('wallet property')
    }

    const index = this.getAll().findIndex(wallet => wallet.name === props.name)

    if (index !== -1) {
      throw new UsedName('Wallet')
    }

    const wallet = new FileKeystoreWallet({ ...props, id: uuid() })

    wallet.saveKeystore(props.keystore!)

    this.listStore.writeSync(this.walletsKey, [...this.getAll(), wallet.toJSON()])

    this.setCurrent(wallet.id)
    return wallet
  }

  public update = (id: string, props: Omit<WalletProperties, 'id' | 'extendedKey'>) => {
    const wallets = this.getAll()
    const index = wallets.findIndex((w: WalletProperties) => w.id === id)
    if (index === -1) {
      throw new WalletNotFound(id)
    }

    const wallet = FileKeystoreWallet.fromJSON(wallets[index])

    if (wallet.name !== props.name && wallets.findIndex(storeWallet => storeWallet.name === props.name) !== -1) {
      throw new UsedName('Wallet')
    }

    wallet.update(props)

    if (props.keystore) {
      wallet.saveKeystore(props.keystore)
    }
    wallets[index] = wallet.toJSON()
    this.listStore.writeSync(this.walletsKey, wallets)
  }

  public delete = async (id: string) => {
    const wallets = this.getAll()
    const walletJSON = wallets.find(w => w.id === id)

    if (!walletJSON) {
      throw new WalletNotFound(id)
    }

    const wallet = FileKeystoreWallet.fromJSON(walletJSON)
    const newWallets = wallets.filter(w => w.id !== id)

    const current = this.getCurrent()
    const currentID = current ? current.id : ''

    if (currentID === id) {
      if (newWallets.length > 0) {
        this.setCurrent(newWallets[0].id)
      } else {
        this.setCurrent('')
      }
    }

    this.listStore.writeSync(this.walletsKey, newWallets)
    wallet.deleteKeystore()
  }

  public setCurrent = (id: string) => {
    if (id === undefined) {
      throw new IsRequired('ID')
    }

    if (id !== '') {
      const wallet = this.get(id)
      if (!wallet) {
        throw new WalletNotFound(id)
      }
    }

    this.listStore.writeSync(this.currentWalletKey, id)
  }

  public getCurrent = () => {
    const walletId = this.listStore.readSync(this.currentWalletKey) as string
    if (walletId) {
      return this.get(walletId)
    }
    return undefined
  }

  public validate = ({ id, password }: { id: string; password: string }) => {
    const wallet = this.get(id)
    if (!wallet) {
      throw new WalletNotFound(id)
    }

    return wallet.loadKeystore().checkPassword(password)
  }

  public clearAll = () => {
    this.getAll().forEach(w => {
      const wallet = FileKeystoreWallet.fromJSON(w)
      wallet.deleteKeystore()
    })
    this.listStore.clear()
  }

  // path is a BIP44 full path such as "m/44'/309'/0'/0/0"
  public getAddressInfos = async (walletID: string): Promise<AddressInterface[]> => {
    const wallet = await this.get(walletID)
    if (!wallet) {
      throw new WalletNotFound(walletID)
    }
    const addrs = await AddressService.allAddressesByWalletId(walletID)
    return addrs
  }

  public getChangeAddress = async (): Promise<string> => {
    return ""
  }

  public requestPassword = (walletID: string, actionType: 'delete-wallet' | 'backup-wallet') => {
    if (WindowManager.mainWindow) {
      CommandSubject.next({
        winID: WindowManager.mainWindow.id,
        type: actionType,
        payload: walletID,
      })
    }
  }
}
