import 'dotenv/config'
import mongoose from 'mongoose'

async function fixDatabaseIndexes() {
  console.log('Connecting to MongoDB Atlas...')
  await mongoose.connect(process.env.MONGODB_URI)
  const collection = mongoose.connection.db.collection('users')

  console.log('1. Cleaning legacy null values...')
  const unsetPhoneRes = await collection.updateMany({ phone: null }, { $unset: { phone: '' } })
  const unsetEmailRes = await collection.updateMany({ email: null }, { $unset: { email: '' } })
  console.log(`   Cleaned ${unsetPhoneRes.modifiedCount} phone:null records and ${unsetEmailRes.modifiedCount} email:null records.`)

  console.log('2. Dropping legacy non-sparse indexes...')
  try {
    await collection.dropIndex('phone_1')
    console.log('   Dropped legacy phone_1 index')
  } catch (err) {
    console.log('   phone_1 index note:', err.message)
  }

  try {
    await collection.dropIndex('email_1')
    console.log('   Dropped legacy email_1 index')
  } catch (err) {
    console.log('   email_1 index note:', err.message)
  }

  console.log('3. Creating proper sparse unique indexes...')
  await collection.createIndex({ email: 1 }, { unique: true, sparse: true })
  await collection.createIndex({ phone: 1 }, { unique: true, sparse: true })
  console.log('   Created email_1 and phone_1 with { unique: true, sparse: true }')

  const indexes = await collection.indexes()
  console.log('Current collection indexes:\n', JSON.stringify(indexes, null, 2))

  console.log('\n✅ Database indexes and legacy records fixed successfully!')
  await mongoose.disconnect()
}

fixDatabaseIndexes().catch((err) => {
  console.error('Migration error:', err)
  process.exit(1)
})
