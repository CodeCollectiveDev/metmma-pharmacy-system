<script setup>
import EmployeePicker from '@/components/EmployeePicker.vue'
import SectionNav from '@/components/SectionNav.vue'
import { ref, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import AppDialog from '@/components/AppDialog.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import api from '@/services/api/apiClient'
import { confirmAction } from '@/composables/useFeedback'
const records=ref([]),pagination=ref(null),status=ref('pending'),loading=ref(false),saving=ref(false),error=ref(null),notice=ref(''),open=ref(false)
const blank=()=>({employee_id:'',leave_type:'Annual',reason:'',start_date:'',expected_return_date:''})
const form=ref(blank())
const actions={pending:['approved','rejected','cancelled'],approved:['completed','cancelled']}
const labels={approved:'Approve',rejected:'Reject',cancelled:'Cancel',completed:'Mark returned'}
async function load(page=1){loading.value=true;error.value=null;try{const r=await api.get('/leave',{params:{page,status:status.value||undefined}});records.value=r.data.data;pagination.value=r.data.pagination}catch(e){error.value=e}finally{loading.value=false}}
function create(){form.value=blank();error.value=null;open.value=true}
async function save(){if(saving.value)return;saving.value=true;error.value=null;try{await api.post('/leave',{...form.value,employee_id:Number(form.value.employee_id)});open.value=false;status.value='pending';notice.value='Leave request saved for review.';await load()}catch(e){error.value=e}finally{saving.value=false}}
async function change(record,next){if(!await confirmAction(`${labels[next]} leave?`,`${record.first_name} ${record.last_name}: ${record.start_date} to ${record.expected_return_date}.`,labels[next]))return;saving.value=true;try{await api.patch(`/leave/${record.id}`,{status:next});notice.value='Leave status updated.';await load(pagination.value.page)}catch(e){error.value=e}finally{saving.value=false}}
onMounted(load)
</script>
<template>
<MainLayout title="Leave" subtitle="Record, review and track staff leave">
    <SectionNav section="team" />
<ErrorNotice v-if="!open" :error="error" :retry="load"/><p v-if="notice" role="status" class="success-notice mb-4">{{notice}}</p>
<div class="panel flex flex-wrap gap-3 items-end mb-4"><label class="flex-1">Show<select v-model="status" class="field" @change="load()"><option value="">All leave</option><option value="current">On leave today</option><option v-for="s in ['pending','approved','rejected','cancelled','completed']" :key="s" :value="s">{{s}}</option></select></label><button class="primary" @click="create">Record leave request</button><router-link class="secondary" to="/hr">Staff records</router-link></div>
<p v-if="loading" role="status">Loading leave…</p>
<div class="panel overflow-x-auto p-0"><table class="w-full"><thead><tr><th class="p-3 text-left">Employee</th><th class="p-3 text-left">Leave</th><th class="p-3 text-left">Dates</th><th class="p-3 text-left">Status / actions</th></tr></thead><tbody><tr v-for="r in records" :key="r.id" class="border-t"><td class="p-3">{{r.first_name}} {{r.last_name}}</td><td class="p-3">{{r.leave_type}}<p class="text-sm whitespace-pre-wrap">{{r.reason}}</p></td><td class="p-3">{{r.start_date}} – {{r.expected_return_date}}<p class="text-sm">{{r.total_days}} calendar days (inclusive)</p></td><td class="p-3">{{r.status}}<div class="flex gap-2 mt-2"><button v-for="next in actions[r.status]||[]" :key="next" class="secondary" :disabled="saving" @click="change(r,next)">{{labels[next]}}</button></div></td></tr></tbody></table><p v-if="!loading&&!records.length" class="p-5">No leave records match this filter.</p><PaginationControls :pagination="pagination" :loading="loading" @change="load"/></div>
<AppDialog :open="open" title="Record leave request" :dismissible="!saving" @close="open=false"><form v-form-feedback="error" class="space-y-3" @submit.prevent="save"><ErrorNotice :error="error"/><p class="form-note">Fields marked * are required. Choose an employee, then enter their leave dates.</p><EmployeePicker v-model="form.employee_id" required :disabled="saving"/><label class="block">Leave type<input name="leave_type" v-model="form.leave_type" required maxlength="50" class="field" list="leave-types"/><datalist id="leave-types"><option>Annual</option><option>Sick</option><option>Maternity</option><option>Compassionate</option><option>Unpaid</option></datalist></label><label class="block">First day<input name="start_date" v-model="form.start_date" type="date" required class="field"/></label><label class="block">Last day of leave<input name="expected_return_date" v-model="form.expected_return_date" type="date" :min="form.start_date" required class="field"/></label><label class="block">Reason (optional)<textarea name="reason" v-model="form.reason" maxlength="1000" class="field"/></label><button class="primary" :disabled="saving">{{saving?'Saving…':'Submit for review'}}</button></form></AppDialog>
</MainLayout>
</template>
