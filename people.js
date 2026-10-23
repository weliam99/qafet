import {shiftGroups} from './shifts.js';
import {isAdminRole,normalizeRole} from './roleAccess.js';
const arabicDigits='٠١٢٣٤٥٦٧٨٩';

export function normalizePhone(value=''){
  return String(value).trim().replace(/[٠-٩]/g,d=>String(arabicDigits.indexOf(d))).replace(/[\s()-]/g,'');
}

export function normalizeUserAccounts(state){
  let changed=false;
  (state.users||[]).forEach(user=>{
    const normalizedRole=normalizeRole(user.role);
    if(user.role!==normalizedRole&&['owner','admin','supervisor','guard'].includes(normalizedRole)){user.role=normalizedRole;changed=true;}
    const storedPhone=normalizePhone(user.phone||'');
    const legacyPhone=normalizePhone(user.username||'');
    const phone=/^\+?[0-9]{8,15}$/.test(storedPhone)?storedPhone:/^\+?[0-9]{8,15}$/.test(legacyPhone)?legacyPhone:'';
    if(phone&&user.phone!==phone){user.phone=phone;changed=true;}
    if(phone&&user.username!==phone){user.username=phone;changed=true;}
    if(!user.name||!String(user.name).trim()){
      user.name=user.role==='supervisor'?'مشرف ميداني':isAdminRole(user.role)?(user.role==='owner'?'المالك':'الإدارة'):'فرد ميداني';
      changed=true;
    }
  });
  return changed;
}

const isArabicFullName=value=>{
  const words=String(value||'').trim().split(/\s+/).filter(Boolean);
  return words.length>=2&&/[\u0600-\u06FF]/.test(value);
};

export function renderPeopleView({state,t,esc,initials,roleName,saveState,showToast,projects=[],visibleUsers=()=>[],global=false}){
  const root=document.querySelector('#view-people');
  if(!root)return;
  const rows=visibleUsers({global}).filter(user=>!isAdminRole(user.role));
  const sites=state.sites||[];
  const groups=shiftGroups();
  const supervisors=(state.users||[]).filter(user=>user.role==='supervisor');
  const projectList=projects.length?projects:(state.projects||[]);
  const formMarkup=`<div class="card form-card people-form-card" id="peopleForm" hidden><div class="card-head"><h3 id="peopleFormTitle">${t('people.addTitle')}</h3><button class="icon-btn" id="cancelPerson" aria-label="${t('common.close')}">×</button></div><div class="form-grid"><div class="field"><label for="personPhone">${t('people.mobile')} *</label><input id="personPhone" dir="ltr" inputmode="tel" autocomplete="tel" placeholder="${t('auth.phonePlaceholder')}" required></div><div class="field full"><label for="personFullName">${t('people.fullName')} *</label><input id="personFullName" dir="rtl" autocomplete="name" placeholder="${t('people.fullNamePlaceholder')}" required></div><div class="field"><label for="personPassword">${t('people.password')} *</label><input id="personPassword" type="password" autocomplete="new-password" placeholder="${t('people.passwordPlaceholder')}"></div><div class="field"><label for="personRole">${t('people.role')} *</label><select id="personRole"><option value="guard">${t('auth.guard')}</option><option value="supervisor">${t('auth.supervisor')}</option></select></div><div class="field"><label for="personShiftGroup">${t('people.shiftGroup')} *</label><select id="personShiftGroup">${groups.map(group=>`<option value="${group.id}">${t(group.nameKey)} · ${t(group.shift==='morning'?'dashboard.shiftMorning':'dashboard.shiftEvening')}</option>`).join('')}</select></div><div class="field"><label for="personSupervisor">${t('people.supervisor')}</label><select id="personSupervisor"><option value="">${t('people.noSupervisor')}</option>${supervisors.map(user=>`<option value="${esc(user.id)}">${esc(user.name)}</option>`).join('')}</select></div><div class="field"><label for="personProject">${t('people.project')} *</label><select id="personProject">${projectList.map(project=>`<option value="${esc(project.id)}">${esc(project.name)}</option>`).join('')}</select></div><div class="field full"><label for="personSite">${t('people.site')} *</label><select id="personSite">${sites.map(site=>`<option value="${esc(site.name)}">${esc(site.name)}</option>`).join('')}</select></div></div><p class="form-error" id="peopleFormError" hidden></p><div class="header-actions"><button class="btn btn-primary" id="savePerson">${t('people.save')}</button><button class="btn btn-outline" id="cancelPersonSecondary">${t('common.cancel')}</button></div></div>`;
  const table=`<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>${t('people.person')}</th><th>${t('people.role')}</th><th>${t('people.supervisor')}</th><th>${t('people.shiftGroup')}</th><th>${t('people.project')}</th><th>${t('people.username')}</th><th>${t('common.edit')}</th></tr></thead><tbody>${rows.length?rows.map(user=>{const supervisor=supervisors.find(item=>item.id===user.supervisorId);const project=projectList.find(item=>item.id===user.projectId);return `<tr><td><div class="person-cell"><span class="mini-avatar">${esc(initials(user.name))}</span>${esc(user.name)}</div></td><td>${esc(roleName(user.role))}</td><td>${esc(supervisor?.name||t('people.noSupervisor'))}</td><td>${esc(t((groups.find(group=>group.id===user.shiftGroup)||groups[0]).nameKey))}</td><td>${esc(project?.name||t('projects.main'))}</td><td dir="ltr">${esc(user.phone||user.username||'—')}</td><td><button class="btn btn-outline" data-edit-user="${esc(user.id)}">${t('common.edit')}</button><button class="btn btn-secondary" data-password-user="${esc(user.id)}">${t('people.changePassword')}</button></td></tr>`;}).join(''):`<tr><td colspan="7"><div class="empty-state"><strong>${t('people.empty')}</strong>${t('people.emptyHint')}</div></td></tr>`}</tbody></table></div></div>`;
  root.innerHTML=`<div class="view-header"><div><div class="kicker">${esc(t('nav.people'))}</div><h1>${esc(t('people.title'))}</h1><p>${esc(t('people.subtitle'))}</p></div><div class="header-actions"><button class="btn btn-primary" id="addPerson">+ ${t('people.add')}</button></div></div>${formMarkup}${table}`;
  const form=root.querySelector('#peopleForm'),formTitle=root.querySelector('#peopleFormTitle'),nameInput=root.querySelector('#personFullName'),phoneInput=root.querySelector('#personPhone'),passwordInput=root.querySelector('#personPassword'),roleInput=root.querySelector('#personRole'),shiftInput=root.querySelector('#personShiftGroup'),supervisorInput=root.querySelector('#personSupervisor'),projectInput=root.querySelector('#personProject'),siteInput=root.querySelector('#personSite'),error=root.querySelector('#peopleFormError');
  let editingId=null;
  const openForm=(user=null,changePassword=false)=>{editingId=user?.id||null;form.hidden=false;formTitle.textContent=changePassword?t('people.changePassword'):editingId?t('people.editTitle'):t('people.addTitle');nameInput.value=user?.name||'';phoneInput.value=user?.phone||user?.username||'';passwordInput.value='';passwordInput.required=!editingId;passwordInput.placeholder=editingId?t('people.newPassword'):t('people.passwordPlaceholder');roleInput.value=user?.role||'guard';shiftInput.value=user?.shiftGroup||groups[0]?.id||'';supervisorInput.value=user?.supervisorId||'';projectInput.value=user?.projectId||projectList[0]?.id||'';siteInput.value=user?.site||sites[0]?.name||'';error.hidden=true;(changePassword?passwordInput:nameInput).focus();};
  const closeForm=()=>{form.hidden=true;editingId=null;};
  root.querySelector('#addPerson').addEventListener('click',()=>openForm());root.querySelector('#cancelPerson').addEventListener('click',closeForm);root.querySelector('#cancelPersonSecondary').addEventListener('click',closeForm);
  root.querySelector('#savePerson').addEventListener('click',()=>{const name=nameInput.value.trim(),phone=normalizePhone(phoneInput.value),password=passwordInput.value.trim(),duplicate=(state.users||[]).find(user=>normalizePhone(user.phone||user.username)===phone&&user.id!==editingId),fail=message=>{error.textContent=message;error.hidden=false;};if(!isArabicFullName(name)){fail(t('people.fullNameRequired'));return;}if(!/^\+?[0-9]{8,15}$/.test(phone)){fail(t('people.mobileRequired'));return;}if(duplicate){fail(t('people.mobileExists'));return;}if(!editingId&&!password){fail(t('people.passwordRequired'));return;}if(password&&password.length<6){fail(t('people.passwordShort'));return;}if(editingId){const user=state.users.find(item=>item.id===editingId);if(!user){fail(t('messages.error'));return;}user.name=name;user.phone=phone;user.username=phone;user.role=roleInput.value;user.shiftGroup=shiftInput.value;user.supervisorId=roleInput.value==='guard'?supervisorInput.value:'';user.projectId=projectInput.value;user.site=siteInput.value;if(password)user.password=password;showToast(password?t('people.passwordChanged'):t('people.updated'));}else{state.users.push({id:`u-${Date.now()}`,name,username:phone,phone,password,role:roleInput.value,shiftGroup:shiftInput.value,supervisorId:roleInput.value==='guard'?supervisorInput.value:'',projectId:projectInput.value,site:siteInput.value,status:'absent',checkIn:null,checkOut:null,lat:sites[0]?.lat||24.7136,lng:sites[0]?.lng||46.6753,patrols:0,score:0});showToast(t('people.created'));}saveState();renderPeopleView({state,t,esc,initials,roleName,saveState,showToast,projects:projectList,visibleUsers,global});});
  root.querySelectorAll('[data-edit-user]').forEach(button=>button.addEventListener('click',()=>{const user=state.users.find(item=>item.id===button.dataset.editUser);if(user)openForm(user);}));
  root.querySelectorAll('[data-password-user]').forEach(button=>button.addEventListener('click',()=>{const user=state.users.find(item=>item.id===button.dataset.passwordUser);if(user)openForm(user,true);}));
}
