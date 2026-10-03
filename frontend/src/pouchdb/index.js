// Read-only access to records saved by older releases. Do not clear or replay them.
import localforage from 'localforage'
const transactions = localforage.createInstance({name:'mpms',storeName:'transactions'})
const products = localforage.createInstance({name:'mpms',storeName:'products'})
export async function getLegacyPendingRecords() {
  const pending = { transactions: [], products: [] }
  for (const [name,store] of [['transactions',transactions],['products',products]]) {
    await store.iterate(value => { if (value.syncStatus === 'pending') pending[name].push(value) })
  }
  return pending
}
