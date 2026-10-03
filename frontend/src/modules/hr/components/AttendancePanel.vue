<script setup>
import {ref,onMounted,watch} from 'vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import api from '@/services/api/apiClient'
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
const mode=ref('day'),date=ref(today()),start=ref(''),end=ref(''),search=ref(''),status=ref(''),records=ref([]),pagination=ref(null),loading=ref(false),saving=ref(false),error=ref(null),notice=ref('')
const statuses=['present','absent','late','leave','holiday']
let generation=0
async function load(page=1){
 const current=++generation;loading.value=true;error.value=null
 try{
  const params={page,search:search.value,...(mode.value==='day'?{start:date.value}:{start:start.value||undefined,end:end.value||undefined,status:status.value||undefined})}
  const r=await api.get(mode.value==='day'?'/attendance/day':'/attendance',{params})
  if(current===generation){records.value=r.data.data.map(r=>({...r,chosen:r.status||'present'}));pagination.value=r.data.pagination}
 }catch(e){if(current===generation){error.value=e;records.value=[];pagination.value=null}}finally{if(current===generation)loading.value=false}
}
async function save(row){
 if(saving.value)return
 const selectedDate=date.value;saving.value=true;error.value=null
 try{await api.post('/attendance',{employee_id:row.employee_id,date:selectedDate,status:row.chosen});notice.value=`${row.first_name} ${row.last_name}: ${row.chosen} saved for ${selectedDate}.`;await load(pagination.value?.page||1)}catch(e){error.value=e}finally{saving.value=false}
}
watch(mode,()=>load());onMounted(()=>load())
</script>
<template>
<section aria-label="Attendance management" class="space-y-4">
<div class="flex gap-3"><button class="secondary" :aria-pressed="mode==='day'" :disabled="saving" @click="mode='day'">Attendance by date</button><button class="secondary" :aria-pressed="mode==='history'" :disabled="saving" @click="mode='history'">Attendance history</button></div>
<form class="panel flex flex-wrap gap-3 items-end" @submit.prevent="load()">
<label v-if="mode==='day'">Attendance date<input v-model="date" aria-label="Attendance date" type="date" required class="field" :disabled="saving" @change="load()" /></label>
<template v-else><label>From<input v-model="start" type="date" class="field" aria-label="Attendance from" /></label><label>To<input v-model="end" type="date" :min="start" class="field" aria-label="Attendance to" /></label><label>Status<select v-model="status" class="field"><option value="">All statuses</option><option v-for="s in statuses" :key="s">{{s}}</option></select></label></template>
<label class="flex-1">Find staff<input v-model="search" class="field" maxlength="100" placeholder="Name or staff code" /></label><button class="primary" :disabled="loading||saving">Apply filters</button>
</form>
<ErrorNotice :error="error" :retry="load"/><p v-if="notice" role="status" class="text-green-800">{{notice}}</p><p v-if="loading" role="status">Loading attendance…</p>
<p v-if="mode==='day'" class="text-sm text-gray-600">Choose a date to see saved attendance and record or correct each employee’s status. Unmarked staff are not counted as absent.</p>
<div class="panel overflow-x-auto p-0"><table class="w-full"><thead><tr><th class="p-3 text-left">Employee</th><th class="p-3 text-left">Date</th><th class="p-3 text-left">Saved status</th><th class="p-3 text-left">{{mode==='day'?'Record attendance':'Notes'}}</th></tr></thead><tbody><tr v-for="r in records" :key="r.employee_id+'-'+r.id" class="border-t"><td class="p-3">{{r.first_name}} {{r.last_name}}<p class="text-sm text-gray-600">{{r.employee_code}}</p></td><td class="p-3">{{mode==='day'?date:r.date}}</td><td class="p-3">{{r.status||'Not marked'}}</td><td class="p-3"><div v-if="mode==='day'" class="flex gap-2"><select v-model="r.chosen" :aria-label="`Status for ${r.first_name} ${r.last_name}`" class="field" :disabled="saving||loading"><option v-for="s in statuses" :key="s">{{s}}</option></select><button class="secondary" :disabled="saving||loading||!date||r.chosen===r.status" @click="save(r)">Save</button></div><span v-else>{{r.notes||'—'}}</span></td></tr></tbody></table><p v-if="!loading&&!records.length&&!error" class="p-5">{{mode==='day'?'No active staff match this search.':'No attendance records match these filters.'}}</p><PaginationControls :pagination="pagination" :loading="loading||saving" @change="load"/></div>
</section>
</template>
