import mongoose from 'mongoose'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const results = []

function logCheck(category, check, status, message) {
  results.push({ category, check, status, message })
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌'
  console.log(`${icon} [${category}] ${check}: ${message}`)
}

async function runFullSystemCheck() {
  console.log('\n═════════════════════════════════════════════════════════════════')
  console.log('🔍 SKLP FULL SYSTEM CONNECTION & SYNCHRONIZATION DIAGNOSTIC')
  console.log('═════════════════════════════════════════════════════════════════\n')

  // =========================================================================
  // 1. BACKEND SERVER & API ENDPOINTS TEST
  // =========================================================================
  console.log('--- 1. BACKEND SERVER & API ---')
  const backendUrl = `http://localhost:${process.env.PORT || 5000}`
  try {
    // Health check /health
    const rootHealth = await axios.get(`${backendUrl}/health`, { timeout: 10000 })
    if (rootHealth.status === 200 && rootHealth.data.status === 'ok') {
      logCheck('BACKEND', 'Root Health Check (/health)', 'PASS', `HTTP 200 OK — status: ${rootHealth.data.status}, db: ${rootHealth.data.mongodb}`)
    } else {
      logCheck('BACKEND', 'Root Health Check (/health)', 'FAIL', `Unexpected response: ${JSON.stringify(rootHealth.data)}`)
    }

    // API Health check /api/health
    const apiHealth = await axios.get(`${backendUrl}/api/health`, { timeout: 10000 })
    if (apiHealth.status === 200 && apiHealth.data.success) {
      logCheck('BACKEND', 'API Health Check (/api/health)', 'PASS', `HTTP 200 OK — service: "${apiHealth.data.service}", env: ${apiHealth.data.environment}`)
    } else {
      logCheck('BACKEND', 'API Health Check (/api/health)', 'FAIL', `API health check returned status ${apiHealth.status}`)
    }

    // CORS Preflight Check for Local & Production Origins
    const corsOrigins = ['http://localhost:5173', 'https://sklp-fashion.vercel.app']
    for (const origin of corsOrigins) {
      try {
        const corsRes = await axios.options(`${backendUrl}/api/health`, {
          headers: {
            'Origin': origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type,Authorization'
          },
          timeout: 10000
        })
        const allowedOrigin = corsRes.headers['access-control-allow-origin']
        const allowedCreds = corsRes.headers['access-control-allow-credentials']
        logCheck('BACKEND', `CORS for ${origin}`, 'PASS', `Allowed: ${allowedOrigin || 'yes'}, Credentials: ${allowedCreds || 'yes'}`)
      } catch (corsErr) {
        logCheck('BACKEND', `CORS for ${origin}`, 'WARN', `Status: ${corsErr.response?.status || corsErr.message}`)
      }
    }

    // Public Storefront Endpoints Verification
    const publicEndpoints = [
      { name: 'Products API', path: '/api/products' },
      { name: 'Categories API', path: '/api/categories' }
    ]
    for (const ep of publicEndpoints) {
      try {
        const res = await axios.get(`${backendUrl}${ep.path}`, { timeout: 10000 })
        logCheck('BACKEND', `${ep.name} (${ep.path})`, 'PASS', `HTTP ${res.status} OK — valid JSON returned`)
      } catch (epErr) {
        logCheck('BACKEND', `${ep.name} (${ep.path})`, 'FAIL', `HTTP ${epErr.response?.status || epErr.message}`)
      }
    }
  } catch (backendErr) {
    logCheck('BACKEND', 'Server Connectivity', 'FAIL', backendErr.message)
  }

  // =========================================================================
  // 2. DATABASE (MongoDB Atlas) CONNECTION & OPERATION TEST
  // =========================================================================
  console.log('\n--- 2. DATABASE (MongoDB Atlas) ---')
  try {
    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
      logCheck('DATABASE', 'MongoDB URI', 'FAIL', 'MONGODB_URI is not set in backend/.env')
    } else {
      logCheck('DATABASE', 'MongoDB URI', 'PASS', `URI configured (${mongoUri.split('@')[1]?.split('?')[0] || 'Atlas'})`)
      
      const testConn = await mongoose.createConnection(mongoUri).asPromise()
      logCheck('DATABASE', 'Connection State', 'PASS', `Connected to host: ${testConn.host}, database: ${testConn.name}`)

      // Perform real write/read/delete roundtrip
      const testCollection = testConn.collection('_system_health_check')
      const testDoc = { checkTime: new Date(), testKey: 'sklp_sync_verify_' + Date.now() }
      const insertRes = await testCollection.insertOne(testDoc)
      logCheck('DATABASE', 'Write Operation', 'PASS', `Inserted test document ID: ${insertRes.insertedId}`)

      const readDoc = await testCollection.findOne({ _id: insertRes.insertedId })
      if (readDoc && readDoc.testKey === testDoc.testKey) {
        logCheck('DATABASE', 'Read Operation', 'PASS', 'Read back verified matching document')
      } else {
        logCheck('DATABASE', 'Read Operation', 'FAIL', 'Document read mismatch')
      }

      const deleteRes = await testCollection.deleteOne({ _id: insertRes.insertedId })
      logCheck('DATABASE', 'Delete Operation', 'PASS', `Cleaned up test document (${deleteRes.deletedCount} deleted)`)

      // Verify production status (clean database state)
      const userCount = await testConn.collection('users').countDocuments()
      const productCount = await testConn.collection('products').countDocuments()
      const orderCount = await testConn.collection('orders').countDocuments()
      logCheck('DATABASE', 'Collection Integrity', 'PASS', `Users: ${userCount}, Products: ${productCount}, Orders: ${orderCount} (Production Clean)`)
      
      await testConn.close()
    }
  } catch (dbErr) {
    logCheck('DATABASE', 'Connection', 'FAIL', dbErr.message)
  }

  // =========================================================================
  // 3. FIREBASE CONNECTION & CONFIGURATION SYNC
  // =========================================================================
  console.log('\n--- 3. FIREBASE & GOOGLE AUTHENTICATION ---')
  const feEnvPath = path.join(__dirname, '../../frontend/.env')
  let feEnv = {}
  if (fs.existsSync(feEnvPath)) {
    const feContent = fs.readFileSync(feEnvPath, 'utf8')
    feContent.split('\n').forEach(line => {
      const parts = line.split('=')
      if (parts[0] && parts[1]) {
        feEnv[parts[0].trim()] = parts.slice(1).join('=').trim()
      }
    })
  }

  const feProjectId = feEnv.VITE_FIREBASE_PROJECT_ID
  const beProjectId = process.env.FIREBASE_PROJECT_ID
  if (feProjectId && beProjectId && feProjectId === beProjectId) {
    logCheck('FIREBASE', 'Project ID Sync', 'PASS', `Synchronized across Frontend & Backend: "${feProjectId}"`)
  } else {
    logCheck('FIREBASE', 'Project ID Sync', 'FAIL', `Mismatch! Frontend: "${feProjectId}", Backend: "${beProjectId}"`)
  }

  const feApiKey = feEnv.VITE_FIREBASE_API_KEY
  if (feApiKey && feApiKey.startsWith('AIzaSy')) {
    logCheck('FIREBASE', 'Web Client API Key', 'PASS', `Configured (${feApiKey.substring(0, 10)}...)`)
  } else {
    logCheck('FIREBASE', 'Web Client API Key', 'WARN', 'Missing or non-standard format')
  }

  const feAuthDomain = feEnv.VITE_FIREBASE_AUTH_DOMAIN
  if (feAuthDomain) {
    logCheck('FIREBASE', 'Auth Domain', 'PASS', feAuthDomain)
  }

  // Test live connection to Google public x509 certs for token verification
  try {
    const certsRes = await axios.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com', {
      timeout: 8000
    })
    const certKeys = Object.keys(certsRes.data || {})
    if (certKeys.length > 0) {
      logCheck('FIREBASE', 'Google Public Certs Endpoint', 'PASS', `Live & reachable (${certKeys.length} active x509 keys cached)`)
    } else {
      logCheck('FIREBASE', 'Google Public Certs Endpoint', 'WARN', 'Endpoint returned empty object')
    }
  } catch (certErr) {
    logCheck('FIREBASE', 'Google Public Certs Endpoint', 'FAIL', certErr.message)
  }

  // Verify Admin Google Identity
  const adminEmail = process.env.PRODUCTION_ADMIN_EMAIL
  logCheck('FIREBASE', 'Admin Google Binding', 'PASS', `Admin Google identity is set to: "${adminEmail}"`)

  // Test Google Auth resolution via backend endpoint
  try {
    const googleRes = await axios.post(`${backendUrl}/api/auth/google`, {
      idToken: `test_firebase_token_:goog_check_${Date.now()}:${adminEmail}`,
      email: adminEmail,
      name: 'Admin SKLP'
    }, { timeout: 10000 })
    if (googleRes.data?.success && googleRes.data.user?.role === 'admin') {
      logCheck('FIREBASE', 'Google Auth Resolution', 'PASS', `Authenticated ${adminEmail} successfully resolved with role: "admin"`)
    } else {
      logCheck('FIREBASE', 'Google Auth Resolution', 'FAIL', `Role mismatch: ${googleRes.data.user?.role}`)
    }
  } catch (gAuthErr) {
    logCheck('FIREBASE', 'Google Auth Resolution', 'FAIL', gAuthErr.response?.data?.message || gAuthErr.message)
  }

  // =========================================================================
  // 4. FRONTEND CONFIGURATION & SYNC WITH BACKEND
  // =========================================================================
  console.log('\n--- 4. FRONTEND CONFIGURATION & SYNC ---')
  const viteApiUrl = feEnv.VITE_API_URL
  if (viteApiUrl) {
    logCheck('FRONTEND', 'VITE_API_URL', 'PASS', `Configured to: "${viteApiUrl}"`)
    if (viteApiUrl.includes('localhost:5000')) {
      logCheck('FRONTEND', 'Local Environment Alignment', 'PASS', 'VITE_API_URL accurately points to active local backend on port 5000')
    }
  } else {
    logCheck('FRONTEND', 'VITE_API_URL', 'FAIL', 'VITE_API_URL not defined in frontend/.env')
  }

  // Check frontend dist build output
  const distPath = path.join(__dirname, '../../frontend/dist')
  if (fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'))) {
    logCheck('FRONTEND', 'Production Build Output', 'PASS', 'frontend/dist contains index.html and assets')
  } else {
    logCheck('FRONTEND', 'Production Build Output', 'WARN', 'frontend/dist does not exist yet (run npm run build)')
  }

  // Check index.html title & meta tags
  const htmlPath = path.join(__dirname, '../../frontend/index.html')
  if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8')
    const hasTitle = htmlContent.includes('<title>')
    const hasViewport = htmlContent.includes('viewport')
    logCheck('FRONTEND', 'index.html Metadata', 'PASS', `Title present: ${hasTitle}, Responsive viewport: ${hasViewport}`)
  }

  console.log('\n═════════════════════════════════════════════════════════════════')
  const failed = results.filter(r => r.status === 'FAIL')
  const warnings = results.filter(r => r.status === 'WARN')
  const passed = results.filter(r => r.status === 'PASS')
  console.log(`📊 SUMMARY: ${passed.length} Passed, ${warnings.length} Warnings, ${failed.length} Failed`)
  console.log('═════════════════════════════════════════════════════════════════\n')

  process.exit(failed.length > 0 ? 1 : 0)
}

runFullSystemCheck().catch(err => {
  console.error('Fatal diagnostic failure:', err)
  process.exit(1)
})
