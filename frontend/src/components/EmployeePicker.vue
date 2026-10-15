<script setup>
import { ref, watch, onBeforeUnmount, useId } from 'vue'
import { Search, X } from 'lucide-vue-next'
import api from '@/services/api/apiClient'
import ErrorNotice from './ErrorNotice.vue'
const props = defineProps({ modelValue: [Number, String], required: Boolean, unlinked: Boolean, disabled: Boolean })
const emit = defineEmits(['update:modelValue', 'select'])
const id = useId(), query = ref(''), selected = ref(null), rows = ref([]), page = ref(null), open = ref(false), loading = ref(false), error = ref(null), input = ref(null), active = ref(-1)
let timer, generation = 0
function validity() { input.value?.setCustomValidity(query.value && !selected.value ? 'Choose an employee from the matching results.' : '') }
async function load(number = 1) {
  const current = ++generation
  loading.value = true; error.value = null
  try {
    const { data } = await api.get('/employees', { params: { search: query.value, page: number, active: true, ...(props.unlinked ? { unlinked: true } : {}) } })
    if (current !== generation) return
    rows.value = number === 1 ? data.data : [...rows.value, ...data.data]
    page.value = data.pagination; active.value = -1
  } catch (e) { if (current === generation) { error.value = e; rows.value = []; page.value = null } }
  finally { if (current === generation) loading.value = false }
}
function search() {
  selected.value = null; emit('update:modelValue', ''); validity(); open.value = true
  generation++; rows.value = []; page.value = null
  clearTimeout(timer); timer = setTimeout(() => load(), 200)
}
function choose(employee) {
  selected.value = employee; query.value = `${employee.first_name} ${employee.last_name}`
  emit('update:modelValue', employee.id); emit('select', employee); open.value = false; validity()
}
function clear() { query.value = ''; selected.value = null; emit('update:modelValue', ''); emit('select', null); validity(); input.value?.focus(); load() }
function keydown(event) {
  if (event.key === 'Escape') { open.value = false; event.preventDefault(); event.stopPropagation() }
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault(); open.value = true
    active.value = Math.max(0, Math.min(rows.value.length - 1, active.value + (event.key === 'ArrowDown' ? 1 : -1)))
  }
  if (event.key === 'Enter' && open.value) { event.preventDefault(); if (rows.value[active.value]) choose(rows.value[active.value]) }
}
watch(() => props.modelValue, value => { if (!value && selected.value) { selected.value = null; query.value = ''; validity() } })
onBeforeUnmount(() => { clearTimeout(timer); generation++ })
</script>
<template>
  <div class="relative" @focusout="event => { if (!event.currentTarget.contains(event.relatedTarget)) open = false }">
    <label :for="id" class="block font-medium text-sm mb-1">Employee <span v-if="!required" class="text-slate-500 font-normal">(optional)</span></label>
    <div class="relative">
      <Search class="absolute left-3 top-3 h-5 w-5 text-slate-400" aria-hidden="true" />
      <input :id="id" ref="input" v-model="query" name="employee_id" :required="required" :disabled="disabled" class="field pl-10 pr-10" placeholder="Type a name and choose a match" maxlength="100" autocomplete="off" role="combobox" aria-autocomplete="list" :aria-expanded="open" :aria-controls="`${id}-results`" :aria-activedescendant="open && active >= 0 ? `${id}-option-${active}` : undefined" @input="search" @focus="open = true; !selected && load()" @keydown="keydown" />
      <button v-if="query" type="button" class="absolute right-2 top-2 p-1" aria-label="Clear selected employee" :disabled="disabled" @click="clear"><X class="h-5 w-5" /></button>
    </div>
    <div v-if="open" class="mt-1 rounded-lg border border-slate-200 bg-white shadow-sm p-2">
      <ErrorNotice :error="error" :retry="load" />
      <p v-if="loading" role="status" class="p-2 text-sm text-slate-500">Finding employees…</p>
      <ul :id="`${id}-results`" role="listbox" aria-label="Matching employees" class="max-h-48 overflow-auto">
        <li v-for="(employee, index) in rows" :id="`${id}-option-${index}`" :key="employee.id" role="option" :aria-selected="selected?.id === employee.id">
          <button type="button" class="w-full p-3 text-left rounded-lg hover:bg-blue-50" :class="{ 'bg-blue-50': index === active }" @click="choose(employee)"><strong>{{ employee.first_name }} {{ employee.last_name }}</strong><span class="block text-sm text-slate-500">{{ [employee.position, employee.department, employee.email].filter(Boolean).join(' · ') }}</span></button>
        </li>
      </ul>
      <p v-if="!loading && !error && !rows.length" class="p-2 text-sm text-slate-600">No matching {{ unlinked ? 'unlinked ' : '' }}active employees. Try another name or add a staff record.</p>
      <button v-if="page?.hasMore" type="button" class="secondary mt-2 w-full" :disabled="loading" @click="load(page.page + 1)">More matches</button>
    </div>
  </div>
</template>
