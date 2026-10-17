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
const roles = ['admin','pharmacist','cashier','store_manager','hr_officer']
const users=ref([]), pagination=ref(null), search=ref(''), loading=ref(false), saving=ref(false), error=ref(null), notice=ref(''), open=ref(false), selected=ref(null)
const blank=()=>({username:'',full_name:'',email:'',role:'cashier',password:'',employee_id:''})
const passwordBlank=()=>({current_password:'',password:'',confirm:''})
const form=ref(blank())
const passwordForm=ref(passwordBlank()), passwordOpen=ref(false), passwordSaving=ref(false), passwordError=ref(null), passwordHint=ref('')
const self=JSON.parse(localStorage.getItem('user')||'{}').id
async function load(page=1){ loading.value=true; error.value=null; try{const r=await api.get('/accounts',{params:{page,search:search.value}});users.value=r.data.data;pagination.value=r.data.pagination}catch(e){error.value=e}finally{loading.value=false} }
function create(){selected.value=null;form.value=blank();error.value=null;open.value=true}
function edit(user){selected.value=user;form.value={role:user.role,password:'',employee_id:''};error.value=null;open.value=true}
function chooseEmployee(employee){if(employee&&!selected.value){form.value.full_name=`${employee.first_name||''} ${employee.last_name||''}`.trim();form.value.email=employee.email||''}}
async function save(){if(saving.value)return;saving.value=true;error.value=null;try{const body={...form.value};if(!body.employee_id)delete body.employee_id;else body.employee_id=Number(body.employee_id);if(selected.value){if(!body.password)delete body.password;if(body.role===selected.value.role)delete body.role;if(!Object.keys(body).length){open.value=false;return}await api.patch(`/accounts/${selected.value.id}`,body)}else await api.post('/auth/register',body);notice.value=selected.value?'Account updated. Changed credentials require a new sign-in.':'Account created and linked to staff records.';open.value=false;form.value=blank();await load(pagination.value?.page||1)}catch(e){error.value=e}finally{saving.value=false}}
async function toggle(user){if(!await confirmAction(`${user.is_active?'Deactivate':'Activate'} ${user.username}?`,'Deactivated accounts cannot sign in. Staff and sales history are kept.','Confirm'))return;saving.value=true;try{await api.patch(`/accounts/${user.id}`,{is_active:!user.is_active});notice.value='Account status updated.';await load(pagination.value.page)}catch(e){error.value=e}finally{saving.value=false}}
function openPasswordChange(){passwordForm.value=passwordBlank();passwordError.value=null;passwordHint.value='';passwordOpen.value=true}
async function changePassword(){if(passwordSaving.value)return;passwordError.value=null;passwordHint.value='';const{current_password,password,confirm}=passwordForm.value;if(password!==confirm){passwordHint.value='New passwords do not match.';return}if(password===current_password){passwordHint.value='Your new password must be different from your current password.';return}passwordSaving.value=true;try{const r=await api.post('/auth/change-password',{current_password,password});localStorage.setItem('token',r.data.token);passwordOpen.value=false;passwordForm.value=passwordBlank();notice.value='Password changed. Other signed-in devices have been signed out.'}catch(e){passwordError.value=e}finally{passwordSaving.value=false}}
onMounted(load)
</script>
<template>
<MainLayout title="Accounts" subtitle="Create staff sign-ins and manage access">
    <SectionNav section="team" />
<ErrorNotice v-if="!open" :error="error" :retry="load"/><p v-if="notice" role="status" class="success-notice mb-4">{{ notice }}</p>
<form class="panel flex flex-wrap gap-3 mb-4 items-end" @submit.prevent="load()"><label class="flex-1">Find an account<input v-model="search" class="field mt-1" maxlength="100" /></label><button class="secondary" :disabled="loading">Search</button><button type="button" class="primary" @click="create">Create account</button><button type="button" class="secondary" @click="openPasswordChange">Change my password</button></form>
<p v-if="loading" role="status">Loading accounts…</p>
<div class="panel overflow-x-auto p-0"><table class="w-full"><thead><tr><th class="p-3 text-left">Staff member</th><th class="p-3 text-left">Role</th><th class="p-3 text-left">Status</th><th class="p-3 text-left">Actions</th></tr></thead><tbody><tr v-for="u in users" :key="u.id" class="border-t"><td class="p-3">{{u.full_name}}<p class="text-sm text-gray-600">{{u.username}} · {{u.email}}</p><p v-if="!u.employee_id" class="text-sm">No linked staff record</p></td><td class="p-3">{{u.role.replaceAll('_',' ')}}</td><td class="p-3">{{u.is_active?'Active':'Inactive'}}</td><td class="p-3"><div class="flex gap-2"><button class="secondary" :disabled="saving" @click="edit(u)">Edit access</button><button class="secondary" :disabled="saving || u.id===self" @click="toggle(u)">{{u.is_active?'Deactivate':'Activate'}}</button></div></td></tr></tbody></table><p v-if="!loading&&!users.length" class="p-5">No matching accounts.</p><PaginationControls :pagination="pagination" :loading="loading" @change="load"/></div>
<AppDialog :open="open" :title="selected ? `Edit ${selected.username}` : 'Create account'" :dismissible="!saving" @close="open=false;form=blank()">
<form v-form-feedback="error" class="space-y-3" @submit.prevent="save"><p class="form-note">Fields marked * are required.</p><ErrorNotice :error="error"/>
<div v-if="!selected?.employee_id" class="space-y-2"><EmployeePicker v-model="form.employee_id" unlinked :disabled="saving" @select="chooseEmployee"/><p class="text-sm text-slate-500">{{selected?'Leave blank to keep the current staff link.':'Choose an existing employee to fill their details, or leave blank and enter a new staff member below.'}}</p></div>
<template v-if="!selected"><label class="block">Username<input name="username" v-model="form.username" required minlength="3" maxlength="50" autocomplete="off" class="field"/></label><label class="block">Full name<input name="full_name" v-model="form.full_name" required maxlength="100" class="field"/></label><label class="block">Email (optional)<input name="email" v-model="form.email" type="email" maxlength="100" class="field"/></label></template>
<label class="block">Role<select name="role" v-model="form.role" :required="!selected" :disabled="selected?.id===self" class="field"><option v-for="role in roles" :key="role" :value="role">{{role.replaceAll('_',' ')}}</option></select></label>
<label class="block">{{selected?'New password (leave blank to keep current password)':'Password'}}<input name="password" v-model="form.password" type="password" :required="!selected" minlength="10" maxlength="72" autocomplete="new-password" class="field"/></label><p class="text-sm text-gray-600">Use at least 10 characters. Password and access changes end existing sessions.</p>

<button class="primary" :disabled="saving">{{saving?'Saving…':'Save account'}}</button></form>
</AppDialog>
<AppDialog :open="passwordOpen" title="Change my password" :dismissible="!passwordSaving" @close="passwordOpen=false">
<form v-form-feedback="passwordError" class="space-y-3" @submit.prevent="changePassword"><ErrorNotice :error="passwordError"/>
<label class="block">Current password<input name="current_password" v-model="passwordForm.current_password" type="password" required maxlength="72" autocomplete="current-password" class="field"/></label>
<label class="block">New password<input name="password" v-model="passwordForm.password" type="password" required minlength="10" maxlength="72" autocomplete="new-password" class="field"/></label>
<label class="block">Confirm new password<input name="confirm" v-model="passwordForm.confirm" type="password" required minlength="10" maxlength="72" autocomplete="new-password" class="field"/></label>
<p v-if="passwordHint" role="alert" class="text-sm text-red-700">{{passwordHint}}</p>
<p class="text-sm text-gray-600">Use at least 10 characters. Saving signs out every other device signed in as you.</p>
<button class="primary" :disabled="passwordSaving">{{passwordSaving?'Saving…':'Change password'}}</button></form>
</AppDialog>
</MainLayout>
</template>
