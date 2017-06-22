import { Db, MongoClient } from 'mongodb'


export default (mongoUrl: string): () => Promise<Db> => {
  let dbPromise: Promise<Db> | null = null

  return (): Promise<Db> => {
    if (dbPromise) {
      return dbPromise
    }

    console.log(`Connecting to ${mongoUrl}...`)
    dbPromise = MongoClient.connect(mongoUrl).then((db: Db) => {
      if (!db) {
        dbPromise = null
        throw new Error('db is falsy')
      }

      console.log('Connected')

      db.on('error', () => {
        console.log('Db connection error')
        dbPromise = null
      })
      db.on('close', () => {
        console.log('Db connection closed')
        dbPromise = null
      })

      return db
    }).catch(error => {
      dbPromise = null
      return Promise.reject(error)
    })
    return dbPromise as Promise<Db>
  }
}
