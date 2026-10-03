<script setup>
import { ref, onMounted } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import AppDialog from '@/components/AppDialog.vue'
import ErrorNotice from '@/components/ErrorNotice.vue'
import PaginationControls from '@/components/PaginationControls.vue'
import api from '@/services/api/apiClient'
import { confirmAction } from '@/composables/useFeedback'
const roles = ['admin','pharmacist','cashier','store_manager','hr_officer']
const users=ref([]), pagination=ref(null), search=ref(''), loading=ref(false), saving=ref(false), error=ref(null), notice=ref(''), open=ref(false), selected=ref(null), employees=ref([]), employeeSearch=ref(''), employeePage=ref(null)
const blank=()=>({username:'',full_name:'',email:'',role:'cashier',password:'',employee_id:''})
const form=ref(blank())
const self=JSON.parse(localStorage.getItem('user')||'{}').id
async function load(page=1){ loading.value=true; error.value=null; try{const r=await api.get('/accounts',{params:{page,search:search.value}});users.value=r.data.data;pagination.value=r.data.pagination}catch(e){error.value=e}finally{loading.value=false} }
async function findEmployees(page=1){try{const r=await api.get('/employees',{params:{search:employeeSearch.value,page}});employees.value=r.data.data.filter(e=>e.is_active&&!e.user_id);employeePage.value=r.data.pagination}catch(e){error.value=e}}
function create(){selected.value=null;form.value=blank();error.value=null;open.value=true;findEmployees()}
function edit(user){selected.value=user;form.value={role:user.role,password:'',employee_id:''};error.value=null;open.value=true;findEmployees()}
function chooseEmployee(){const employee=employees.value.find(e=>e.id===Number(form.value.employee_id));if(employee&&!selected.value){form.value.full_name=`${employee.first_name||''} ${employee.last_name||''}`.trim();form.value.email=employee.email||''}}
async function save(){if(saving.value)return;saving.value=true;error.value=null;try{const body={...form.value};if(!body.employee_id)delete body.employee_id;else body.employee_id=Number(body.employee_id);if(selected.value){if(!body.password)delete body.password;if(body.role===selected.value.role)delete body.role;if(!Object.keys(body).length){open.value=false;return}await api.patch(`/accounts/${selected.value.id}`,body)}else await api.post('/auth/register',body);notice.value=selected.value?'Account updated. Changed credentials require a new sign-in.':'Account created and linked to staff records.';open.value=false;form.value=blank();await load(pagination.value?.page||1)}catch(e){error.value=e}finally{saving.value=false}}
async function toggle(user){if(!await confirmAction(`${user.is_active?'Deactivate':'Activate'} ${user.username}?`,'Deactivated accounts cannot sign in. Staff and sales history are kept.','Confirm'))return;saving.value=true;try{await api.patch(`/accounts/${user.id}`,{is_active:!user.is_active});notice.value='Account status updated.';await load(pagination.value.page)}catch(e){error.value=e}finally{saving.value=false}}
onMounted(load)
</script>
<template>
<MainLayout title="Accounts" subtitle="Create staff sign-ins and manage access">
<ErrorNotice v-if="!open" :error="error" :retry="load"/><p v-if="notice" role="status" class="mb-4 text-green-800">{{ notice }}</p>
<form class="panel flex gap-3 mb-4 items-end" @submit.prevent="load()"><label class="flex-1">Find an account<input v-model="search" class="field mt-1" maxlength="100" /></label><button class="secondary" :disabled="loading">Search</button><button type="button" class="primary" @click="create">Create account</button></form>
<p v-if="loading" role="status">Loading accounts…</p>
<div class="panel overflow-x-auto p-0"><table class="w-full"><thead><tr><th class="p-3 text-left">Staff member</th><th class="p-3 text-left">Role</th><th class="p-3 text-left">Status</th><th class="p-3 text-left">Actions</th></tr></thead><tbody><tr v-for="u in users" :key="u.id" class="border-t"><td class="p-3">{{u.full_name}}<p class="text-sm text-gray-600">{{u.username}} · {{u.email}}</p><p v-if="!u.employee_id" class="text-sm">No linked staff record</p></td><td class="p-3">{{u.role.replaceAll('_',' ')}}</td><td class="p-3">{{u.is_active?'Active':'Inactive'}}</td><td class="p-3"><div class="flex gap-2"><button class="secondary" :disabled="saving" @click="edit(u)">Edit access</button><button class="secondary" :disabled="saving || u.id===self" @click="toggle(u)">{{u.is_active?'Deactivate':'Activate'}}</button></div></td></tr></tbody></table><p v-if="!loading&&!users.length" class="p-5">No matching accounts.</p><PaginationControls :pagination="pagination" :loading="loading" @change="load"/></div>
<AppDialog :open="open" :title="selected ? `Edit ${selected.username}` : 'Create account'" :dismissible="!saving" @close="open=false;form=blank()">
<form class="space-y-3" @submit.prevent="save"><ErrorNotice :error="error"/>
<template v-if="!selected"><label class="block">Username<input v-model="form.username" required minlength="3" maxlength="50" autocomplete="off" class="field"/></label><label class="block">Full name<input v-model="form.full_name" required maxlength="100" class="field"/></label><label class="block">Email<input v-model="form.email" type="email" maxlength="100" class="field"/></label></template>
<label class="block">Role<select v-model="form.role" :disabled="selected?.id===self" class="field"><option v-for="role in roles" :key="role" :value="role">{{role.replaceAll('_',' ')}}</option></select></label>
<label class="block">{{selected?'New password (leave blank to keep current password)':'Password'}}<input v-model="form.password" type="password" :required="!selected" minlength="10" maxlength="72" autocomplete="new-password" class="field"/></label><p class="text-sm text-gray-600">Use at least 10 characters. Password and access changes end existing sessions.</p>
<div v-if="!selected?.employee_id" class="space-y-2"><label class="block">Find existing staff<input v-model="employeeSearch" class="field" maxlength="100" @keydown.enter.prevent="findEmployees()"/></label><button type="button" class="secondary" @click="findEmployees()">Search staff</button><label class="block">Link staff record<select v-model="form.employee_id" class="field" @change="chooseEmployee"><option value="">{{selected?'Keep current link':'Create a new staff record'}}</option><option v-for="e in employees" :key="e.id" :value="e.id">{{e.first_name}} {{e.last_name}} · {{e.employee_id}}</option></select></label><PaginationControls :pagination="employeePage" @change="findEmployees"/></div>
<button class="primary" :disabled="saving">{{saving?'Saving…':'Save account'}}</button></form>
</AppDialog>
</MainLayout>
</template>
