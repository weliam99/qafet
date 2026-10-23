import {isAdminRole} from './roleAccess.js';

export const ALL_PROJECTS='__all__';

const safeArray=value=>Array.isArray(value)?value:[];
const firstSupervisor=state=>safeArray(state.users).find(user=>user.role==='supervisor');

export function normalizeWorkspaceState(state){
  if(!state)return false;
  let changed=false;
  if(!Array.isArray(state.projects)||!state.projects.length){
    state.projects=[{id:'project-main',name:'المشروع الرئيسي',code:'PRJ-001',status:'active',createdAt:new Date().toISOString()}];
    changed=true;
  }
  const fallbackProject=state.projects[0].id;
  if(!state.currentProjectId) {state.currentProjectId=fallbackProject;changed=true;}
  if(!Array.isArray(state.opinions)) {state.opinions=[];changed=true;}
  const supervisor=firstSupervisor(state);
  safeArray(state.users).forEach(user=>{
    if(!user.projectId){user.projectId=fallbackProject;changed=true;}
    if(user.role==='guard'&&!user.supervisorId&&supervisor){user.supervisorId=supervisor.id;changed=true;}
  });
  ['sites','patrols','reports','requests'].forEach(key=>safeArray(state[key]).forEach(item=>{
    if(!item.projectId){item.projectId=fallbackProject;changed=true;}
  }));
  return changed;
}

export function actor(state){return safeArray(state.users).find(user=>user.id===state.currentUser?.id)||state.currentUser||{};}
export function activeProjectId(state){const current=actor(state);return isAdminRole(current.role)?(state.currentProjectId||state.projects?.[0]?.id||ALL_PROJECTS):(current.projectId||state.projects?.[0]?.id||ALL_PROJECTS);}
export function isAllProjects(state){return isAdminRole(actor(state).role)&&activeProjectId(state)===ALL_PROJECTS;}
export function projectMatches(state,item){return isAllProjects(state)||!item?.projectId||item.projectId===activeProjectId(state);}

export function canSeeUser(state,user,global=false){
  const current=actor(state);
  if(!user)return false;
  if(global)return true;
  if(isAdminRole(current.role))return projectMatches(state,user);
  if(current.role==='supervisor')return projectMatches(state,user)&&(user.id===current.id||user.supervisorId===current.id);
  return user.id===current.id;
}
export function visibleUsers(state,{global=false,includeAdmin=false}={}){
  return safeArray(state.users).filter(user=>(includeAdmin||!isAdminRole(user.role))&&canSeeUser(state,user,global));
}

export function recordMatchesUser(state,item,field='guard',global=false){
  if(global)return true;
  if(!projectMatches(state,item))return false;
  const current=actor(state);
  if(isAdminRole(current.role))return true;
  const id=item?.[`${field}Id`]||item?.byId||item?.userId;
  if(id)return visibleUsers(state).some(user=>user.id===id);
  const name=item?.[field]||item?.by;
  if(current.role==='guard')return name===current.name;
  return visibleUsers(state).some(user=>user.name===name);
}
export function visibleRecords(state,key,field='guard',{global=false}={}){
  return safeArray(state[key]).filter(item=>recordMatchesUser(state,item,field,global));
}
export function visibleSites(state){
  const users=visibleUsers(state);
  const names=new Set(users.map(user=>user.site).filter(Boolean));
  return safeArray(state.sites).filter(site=>projectMatches(state,site)&&(isAdminRole(actor(state).role)||names.size===0||names.has(site.name)));
}

export function projectPickerMarkup({state,t,esc}){
  const current=activeProjectId(state);
  if(!isAdminRole(actor(state).role)){
    const project=state.projects?.find(item=>item.id===current);
    return `<span class="project-context"><small>${t('projects.current')}</small><strong>${esc(project?.name||t('projects.main'))}</strong></span>`;
  }
  const options=[`<option value="${ALL_PROJECTS}" ${current===ALL_PROJECTS?'selected':''}>${t('projects.all')}</option>`,...(state.projects||[]).map(project=>`<option value="${esc(project.id)}" ${current===project.id?'selected':''}>${esc(project.name)}</option>`)].join('');
  return `<label class="project-switcher"><span>${t('projects.switch')}</span><select id="projectScope">${options}</select></label>`;
}

export function projectManagerMarkup({state,t,esc}){
  const projects=state.projects||[];
  return `<div class="card project-manager-card"><div class="card-head"><div><h3>${t('projects.manageTitle')}</h3><small>${t('projects.manageHint')}</small></div><span class="pill dark">${projects.length} ${t('projects.projectCount')}</span></div><form id="projectForm" class="form-grid"><div class="field"><label for="projectName">${t('projects.name')}</label><input id="projectName" required placeholder="${t('projects.namePlaceholder')}"></div><div class="field"><label for="projectCode">${t('projects.code')}</label><input id="projectCode" dir="ltr" placeholder="${t('projects.codePlaceholder')}"></div><div class="header-actions full"><button class="btn btn-primary" type="submit">+ ${t('projects.add')}</button></div></form><div class="project-list">${projects.map(project=>`<div class="project-row"><div><strong>${esc(project.name)}</strong><small dir="ltr">${esc(project.code||'—')}</small></div><span class="pill ${project.status==='active'?'good':'warn'}">${project.status==='active'?t('projects.active'):t('projects.archived')}</span><button class="btn btn-outline" type="button" data-project-select="${esc(project.id)}">${t('projects.open')}</button></div>`).join('')}</div></div>`;
}

export function bindProjectManager({state,saveState,showToast,render}){
  const form=document.querySelector('#projectForm');
  form?.addEventListener('submit',event=>{
    event.preventDefault();
    const name=document.querySelector('#projectName')?.value.trim();
    const code=document.querySelector('#projectCode')?.value.trim()||`PRJ-${String((state.projects?.length||0)+1).padStart(3,'0')}`;
    if(!name){showToast('projects.required');return;}
    const project={id:`project-${Date.now()}`,name,code,status:'active',createdAt:new Date().toISOString()};
    state.projects.push(project);state.currentProjectId=project.id;saveState();showToast('projects.created');render();
  });
  document.querySelectorAll('[data-project-select]').forEach(button=>button.addEventListener('click',()=>{
    state.currentProjectId=button.dataset.projectSelect;saveState();showToast('projects.switched');render();
  }));
}

export function bindProjectPicker({state,saveState,showToast,render}){
  document.querySelector('#projectScope')?.addEventListener('change',event=>{
    state.currentProjectId=event.target.value;saveState();showToast('projects.switched');render();
  });
}
