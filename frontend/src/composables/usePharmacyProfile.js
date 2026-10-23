import { ref } from 'vue'
import { dataService } from '@/services/api/dataService'

const state = ref(null)
let pending

const normalize = (profile = {}) => ({
  pharmacyName: profile.pharmacyName || 'METMMA Pharmacy',
  phone: profile.phone || null,
  email: profile.email || null,
  address: profile.address || null,
  taxRegistrationNumber: profile.taxRegistrationNumber || null,
  logoData: profile.logoData || null
})

export const cachedPharmacyProfile = state

export async function fetchPharmacyProfile({ force = false } = {}) {
  if (state.value && !force) return state.value
  if (pending && !force) return pending
  pending = dataService.getPharmacyProfile()
    .then(response => {
      state.value = normalize(response.data?.data)
      return state.value
    })
    .finally(() => { pending = null })
  return pending
}

export async function savePharmacyProfile(profile) {
  const response = await dataService.updatePharmacyProfile(profile)
  state.value = normalize(response.data?.data)
  return state.value
}
