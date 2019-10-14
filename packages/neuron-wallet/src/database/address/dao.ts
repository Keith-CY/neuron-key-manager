import { Not, In } from 'typeorm'
import { AddressType } from 'models/keys/address'
import AddressEntity, { AddressVersion } from './entities/address'
import { getConnection } from './ormconfig'

export interface Address {
  walletId: string
  address: string
  path: string
  addressType: AddressType
  addressIndex: number
  txCount: number
  liveBalance: string
  sentBalance: string
  pendingBalance: string
  balance: string
  totalBalance: string
  blake160: string
  version: AddressVersion
  description?: string
  isImporting?: boolean | undefined
}

export default class AddressDao {
  public static create = async (addresses: Address[]): Promise<AddressEntity[]> => {
    const addressEntities: AddressEntity[] = addresses.map(address => {
      const addressEntity = new AddressEntity()
      addressEntity.walletId = address.walletId
      addressEntity.address = address.address
      addressEntity.path = address.path
      addressEntity.addressType = address.addressType
      addressEntity.addressIndex = address.addressIndex
      addressEntity.txCount = address.txCount || 0
      addressEntity.blake160 = address.blake160
      addressEntity.version = address.version
      addressEntity.liveBalance = address.liveBalance || '0'
      addressEntity.sentBalance = address.sentBalance || '0'
      addressEntity.pendingBalance = address.pendingBalance || '0'
      return addressEntity
    })

    return getConnection().manager.save(addressEntities)
  }

  public static updateTxCountAndBalance = async (address: string): Promise<AddressEntity[]> => {
    const addressEntities = await getConnection()
      .getRepository(AddressEntity)
      .find({
        address,
      })

    const txCount: number = 0
    const entities = await Promise.all(
      addressEntities.map(async entity => {
        const addressEntity = entity
        addressEntity.txCount = txCount
        addressEntity.liveBalance = "0"
        addressEntity.sentBalance = "0"
        addressEntity.pendingBalance = "0"
        addressEntity.totalBalance = "0"
        return addressEntity
      })
    )

    return getConnection().manager.save(entities)
  }

  public static nextUnusedAddress = async (
    walletId: string,
    version: AddressVersion
  ): Promise<AddressEntity | undefined> => {
    const addressEntity = await getConnection()
      .getRepository(AddressEntity)
      .createQueryBuilder('address')
      .where({
        walletId,
        version,
        addressType: AddressType.Receiving,
        txCount: 0,
      })
      .orderBy('address.addressIndex', 'ASC')
      .getOne()

    return addressEntity
  }

  public static nextUnusedChangeAddress = async (
    walletId: string,
    version: AddressVersion
  ): Promise<AddressEntity | undefined> => {
    const addressEntity = await getConnection()
      .getRepository(AddressEntity)
      .createQueryBuilder('address')
      .where({
        walletId,
        version,
        addressType: AddressType.Change,
        txCount: 0,
      })
      .orderBy('address.addressIndex', 'ASC')
      .getOne()

    return addressEntity
  }

  public static allAddresses = async (version: AddressVersion): Promise<AddressEntity[]> => {
    const addressEntities = await getConnection()
      .getRepository(AddressEntity)
      .createQueryBuilder('address')
      .where({
        version,
      })
      .getMany()

    return addressEntities
  }

  public static allAddressesByWalletId = async (
    walletId: string,
    version: AddressVersion
  ): Promise<AddressEntity[]> => {
    const addressEntities = await getConnection()
      .getRepository(AddressEntity)
      .createQueryBuilder('address')
      .where({
        walletId,
        version,
      })
      .getMany()

    return addressEntities
  }

  public static usedAddressesByWalletId = async (
    walletId: string,
    version: AddressVersion
  ): Promise<AddressEntity[]> => {
    const addressEntities = await getConnection()
      .getRepository(AddressEntity)
      .createQueryBuilder('address')
      .where({
        walletId,
        version,
        txCount: Not(0),
      })
      .getMany()

    return addressEntities
  }

  public static findByAddress = async (address: string, walletId: string): Promise<AddressEntity | undefined> => {
    const addressEntity = await getConnection()
      .getRepository(AddressEntity)
      .createQueryBuilder('address')
      .where({
        address,
        walletId,
      })
      .getOne()

    return addressEntity
  }

  public static findByAddresses = async (addresses: string[]) => {
    const addressEntities = await getConnection()
      .getRepository(AddressEntity)
      .createQueryBuilder('address')
      .where({
        address: In(addresses),
      })
      .getMany()
    return addressEntities
  }

  public static maxAddressIndex = async (
    walletId: string,
    addressType: AddressType,
    version: AddressVersion
  ): Promise<AddressEntity | undefined> => {
    const addressEntity = await getConnection()
      .getRepository(AddressEntity)
      .createQueryBuilder('address')
      .where({
        walletId,
        addressType,
        version,
      })
      .orderBy('address.addressIndex', 'DESC')
      .getOne()

    if (!addressEntity) {
      return undefined
    }

    return addressEntity
  }

  public static deleteByWalletId = async (walletId: string) => {
    const addresses = await getConnection()
      .getRepository(AddressEntity)
      .createQueryBuilder('address')
      .where({
        walletId,
      })
      .getMany()
    const result = addresses.map(addr => addr.toInterface())
    await getConnection().manager.remove(addresses)
    return result
  }
}
