import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { authService } from '@/services/api/authService'

const INACTIVITY_TIMEOUT = 15 * 60 * 1000
const WARNING_BEFORE_LOGOUT = 60 * 1000
const PING_INTERVAL = 5 * 60 * 1000

let lastActivity = Date.now()
let inactivityTimer = null
let warningTimer = null
let pingTimer = null
let isWarningVisible = false

const showWarning = ref(false)
const countdown = ref(60)
const router = useRouter()

const resetInactivity = () => {
  lastActivity = Date.now()
  
  if (showWarning.value) {
    dismissWarning()
  }

  clearTimeout(inactivityTimer)
  clearTimeout(warningTimer)
  clearInterval(pingTimer)

  inactivityTimer = setTimeout(() => {
    showWarning.value = true
    countdown.value = WARNING_BEFORE_LOGOUT / 1000
    isWarningVisible = true

    warningTimer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) {
        performLogout()
      }
    }, 1000)
  }, INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT)

  pingTimer = setInterval(() => {
    authService.ping().catch(() => {})
  }, PING_INTERVAL)
}

const dismissWarning = () => {
  showWarning.value = false
  isWarningVisible = false
  clearInterval(warningTimer)
  resetInactivity()
}

const performLogout = async () => {
  clearTimeout(inactivityTimer)
  clearTimeout(warningTimer)
  clearInterval(pingTimer)
  showWarning.value = false
  isWarningVisible = false

  try {
    await authService.logout()
  } catch {
    // ignore logout errors
  }

  localStorage.removeItem('token')
  localStorage.removeItem('role')
  localStorage.removeItem('user')
  router.push('/login')
}

const startTracking = () => {
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
  events.forEach(event => {
    document.addEventListener(event, resetInactivity, { passive: true })
  })
  resetInactivity()
}

const stopTracking = () => {
  clearTimeout(inactivityTimer)
  clearTimeout(warningTimer)
  clearInterval(pingTimer)
  const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll']
  events.forEach(event => {
    document.removeEventListener(event, resetInactivity)
  })
}

export function useSession() {
  onMounted(() => {
    const token = localStorage.getItem('token')
    if (token && !token.startsWith('pouchdb-session')) {
      startTracking()
    }
  })

  onUnmounted(() => {
    stopTracking()
  })

  return {
    showWarning,
    countdown,
    dismissWarning,
    performLogout,
    startTracking,
    stopTracking
  }
}
