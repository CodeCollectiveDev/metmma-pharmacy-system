import { computed } from 'vue'
import { ROLES, ROLE_HIERARCHY } from '@/router'
import { authService } from '@/services/api/authService'

export const useRole = () => {
  const userRole = computed(() => localStorage.getItem('role') || '')

  const hasRole = (role) => {
    if (Array.isArray(role)) {
      return role.includes(userRole.value)
    }
    return userRole.value === role
  }

  const isSuperAdmin = computed(() => userRole.value === ROLES.SUPER_ADMIN)

  const isManagingDirector = computed(() => userRole.value === ROLES.MANAGING_DIRECTOR)

  const isDirector = computed(() => userRole.value === ROLES.DIRECTOR)

  const isPharmacistManager = computed(() => userRole.value === ROLES.PHARMACIST_MANAGER)

  const isPharmacist = computed(() => userRole.value === ROLES.PHARMACIST)

  const isAssistantPharmacist = computed(() => userRole.value === ROLES.ASSISTANT_PHARMACIST)

  const isStoreManager = computed(() => userRole.value === ROLES.STORE_MANAGER)

  const isCashier = computed(() => userRole.value === ROLES.CASHIER)

  const isHrOfficer = computed(() => userRole.value === ROLES.HR_OFFICER)

  // Users who may provision accounts
  const canManageUsers = computed(() =>
    [ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR].includes(userRole.value)
  )

  const canAccessHr = computed(() =>
    [ROLES.SUPER_ADMIN, ROLES.HR_OFFICER].includes(userRole.value)
  )

  const canAccessInventory = computed(() =>
    [ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR, ROLES.DIRECTOR, ROLES.PHARMACIST_MANAGER, ROLES.PHARMACIST, ROLES.ASSISTANT_PHARMACIST, ROLES.STORE_MANAGER].includes(userRole.value)
  )

  const canAccessReports = computed(() =>
    [ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR, ROLES.DIRECTOR, ROLES.PHARMACIST_MANAGER, ROLES.STORE_MANAGER, ROLES.HR_OFFICER].includes(userRole.value)
  )

  const canAccessPos = computed(() =>
    [ROLES.SUPER_ADMIN, ROLES.PHARMACIST_MANAGER, ROLES.PHARMACIST, ROLES.ASSISTANT_PHARMACIST, ROLES.CASHIER].includes(userRole.value)
  )

  const hasHigherOrEqualRole = (minRole) => {
    return (ROLE_HIERARCHY[userRole.value] || 0) >= (ROLE_HIERARCHY[minRole] || 0)
  }

  const logout = async () => {
    await authService.logout()
  }

  return {
    userRole,
    hasRole,
    isSuperAdmin,
    isManagingDirector,
    isDirector,
    isPharmacistManager,
    isPharmacist,
    isAssistantPharmacist,
    isStoreManager,
    isCashier,
    isHrOfficer,
    canManageUsers,
    canAccessHr,
    canAccessInventory,
    canAccessReports,
    canAccessPos,
    hasHigherOrEqualRole,
    logout
  }
}