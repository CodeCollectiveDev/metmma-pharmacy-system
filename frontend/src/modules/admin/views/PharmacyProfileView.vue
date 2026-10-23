<script setup>
import { computed, onMounted, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import SectionNav from '@/components/SectionNav.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import { cachedPharmacyProfile, fetchPharmacyProfile, savePharmacyProfile } from '@/composables/usePharmacyProfile'
import defaultLogo from '@/assets/metmma_pharmacy_logo.svg'

const loading = ref(false), saving = ref(false), error = ref(null), notice = ref(''), formHint = ref('')
const form = ref({ pharmacyName: 'METMMA Pharmacy', phone: '', email: '', address: '', taxRegistrationNumber: '', logoData: null })
const logoPreview = computed(() => form.value.logoData || defaultLogo)

function apply(profile) {
  form.value = {
    pharmacyName: profile?.pharmacyName || 'METMMA Pharmacy',
    phone: profile?.phone || '',
    email: profile?.email || '',
    address: profile?.address || '',
    taxRegistrationNumber: profile?.taxRegistrationNumber || '',
    logoData: profile?.logoData || null
  }
}

async function load() {
  loading.value = true
  error.value = null
  try { apply(await fetchPharmacyProfile()) } catch (e) { error.value = e } finally { loading.value = false }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function onLogoChange(event) {
  formHint.value = ''
  const file = event.target.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
    formHint.value = 'Logo must be a PNG, JPG, SVG or WEBP image.'
    event.target.value = ''
    return
  }
  if (file.size > 1_500_000) {
    formHint.value = 'Logo is too large. Use a file smaller than 1.5 MB.'
    event.target.value = ''
    return
  }
  form.value.logoData = await fileToDataUrl(file)
  event.target.value = ''
}

function resetLogo() {
  form.value.logoData = null
  formHint.value = ''
}

async function save() {
  if (saving.value) return
  const trimmedPhone = form.value.phone.trim()
  if (trimmedPhone && !/^[0-9+\-()\s]{7,30}$/.test(trimmedPhone)) {
    formHint.value = 'Enter a valid phone number using digits, spaces, +, -, or parentheses.'
    return
  }
  saving.value = true
  error.value = null
  formHint.value = ''
  try {
    await savePharmacyProfile({
      pharmacyName: form.value.pharmacyName.trim(),
      phone: trimmedPhone || null,
      email: form.value.email.trim() || null,
      address: form.value.address.trim() || null,
      taxRegistrationNumber: form.value.taxRegistrationNumber.trim() || null,
      logoData: form.value.logoData || null
    })
    apply(cachedPharmacyProfile.value)
    notice.value = 'Pharmacy profile saved. New receipts will use these details.'
  } catch (e) { error.value = e } finally { saving.value = false }
}

onMounted(load)
</script>
<template>
  <MainLayout title="Pharmacy profile" subtitle="Receipt details and logo">
    <SectionNav section="team" />
    <ErrorNotice :error="error" :retry="load" />
    <p v-if="notice" role="status" class="success-notice mb-4">{{ notice }}</p>
    <p v-if="loading" role="status">Loading pharmacy profile…</p>
    <form v-else v-form-feedback="error" class="panel space-y-3 max-w-2xl" @submit.prevent="save">
      <label class="block">Pharmacy name*<input name="pharmacyName" v-model="form.pharmacyName" required maxlength="120" class="field mt-1" /></label>
      <label class="block">Phone<input name="phone" v-model="form.phone" maxlength="30" class="field mt-1" /></label>
      <label class="block">Email<input name="email" v-model="form.email" type="email" maxlength="120" class="field mt-1" /></label>
      <label class="block">Address / location<textarea name="address" v-model="form.address" maxlength="300" rows="3" class="field mt-1" /></label>
      <label class="block">Tax or registration number (optional)<input name="taxRegistrationNumber" v-model="form.taxRegistrationNumber" maxlength="100" class="field mt-1" /></label>
      <div>
        <p class="font-medium mb-2">Receipt logo</p>
        <img :src="logoPreview" alt="Pharmacy logo preview" class="h-16 w-auto object-contain border rounded bg-white p-2 mb-2" />
        <input type="file" accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp" @change="onLogoChange" />
        <button type="button" class="secondary ml-2" @click="resetLogo">Use default logo</button>
      </div>
      <p v-if="formHint" role="alert" class="text-sm text-red-700">{{ formHint }}</p>
      <button class="primary" :disabled="saving">{{ saving ? 'Saving…' : 'Save profile' }}</button>
    </form>
  </MainLayout>
</template>
