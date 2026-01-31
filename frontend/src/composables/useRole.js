import { computed } from 'vue'
import { ROLES, ROLE_HIERARCHY } from '@/router'

export const useRole = () => {
  const userRole = computed(() => localStorage.getItem('role') || '')

  const hasRole = (role) => {
    if (Array.isArray(role)) {
      return role.includes(userRole.value)
    }
    return userRole.value === role
  }

  const isAdmin = computed(() => userRole.value === ROLES.ADMIN)

  const isHrOfficer = computed(() => userRole.value === ROLES.HR_OFFICER)

  const isStoreManager = computed(() => userRole.value === ROLES.STORE_MANAGER)

  const isPharmacist = computed(() => userRole.value === ROLES.PHARMACIST)

  const isCashier = computed(() => userRole.value === ROLES.CASHIER)

  const canAccessHr = computed(() => 
    [ROLES.ADMIN, ROLES.HR_OFFICER].includes(userRole.value)
  )

  const canAccessInventory = computed(() =>
    [ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST].includes(userRole.value)
  )

  const canAccessReports = computed(() =>
    [ROLES.ADMIN, ROLES.STORE_MANAGER, ROLES.PHARMACIST, ROLES.HR_OFFICER].includes(userRole.value)
  )

  const canAccessPos = computed(() =>
    [ROLES.ADMIN, ROLES.CASHIER].includes(userRole.value)
  )

  const hasHigherOrEqualRole = (minRole) => {
    return (ROLE_HIERARCHY[userRole.value] || 0) >= (ROLE_HIERARCHY[minRole] || 0)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('user')
  }

  return {
    userRole,
    hasRole,
    isAdmin,
    isHrOfficer,
    isStoreManager,
    isPharmacist,
    isCashier,
    canAccessHr,
    canAccessInventory,
    canAccessReports,
    canAccessPos,
    hasHigherOrEqualRole,
    logout
  }
}
