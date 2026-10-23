const list=value=>Array.isArray(value)?value:[];

export function sectionManagerMarkup({state,t,esc}){
  const sites=list(state.sites),projects=list(state.projects);
  const projectOptions=projects.map(project=>`<option value="${esc(project.id)}">${esc(project.name)}</option>`).join('');
  const rows=sites.length?sites.map(site=>`<div class="section-row"><div><strong>${esc(site.name)}</strong><small>${esc(site.code||'—')} · ${Number(site.radius||0)} م</small></div><span class="pill ${site.projectId?'good':'warn'}">${site.projectId?esc(projects.find(project=>project.id===site.projectId)?.name||t('sections.unassigned')):t('sections.unassigned')}</span><button class="btn btn-outline" type="button" data-section-delete="${esc(site.id)}">${t('common.delete')}</button></div>`).join(''):`<div class="empty-state">${t('sections.empty')}</div>`;
  return `<div class="card section-manager-card"><div class="card-head"><div><h3>${t('sections.title')}</h3><small>${t('sections.subtitle')}</small></div><span class="pill dark">${sites.length} ${t('sections.count')}</span></div><form id="sectionForm" class="form-grid"><div class="field"><label for="sectionName">${t('sections.name')}</label><input id="sectionName" name="name" required placeholder="${t('sections.namePlaceholder')}"></div><div class="field"><label for="sectionCode">${t('sections.code')}</label><input id="sectionCode" name="code" dir="ltr" placeholder="${t('sections.codePlaceholder')}"></div><div class="field"><label for="sectionLatitude">${t('sections.latitude')}</label><input id="sectionLatitude" name="lat" inputmode="decimal" placeholder="24.7136"></div><div class="field"><label for="sectionLongitude">${t('sections.longitude')}</label><input id="sectionLongitude" name="lng" inputmode="decimal" placeholder="46.6753"></div><div class="field"><label for="sectionRadius">${t('sections.radius')}</label><input id="sectionRadius" name="radius" type="number" min="50" step="10" value="250"></div><div class="field"><label for="sectionProject">${t('sections.project')}</label><select id="sectionProject" name="projectId">${projectOptions}</select></div><div class="header-actions full"><button class="btn btn-primary" type="submit">+ ${t('sections.add')}</button></div></form><div class="section-list">${rows}</div></div>`;
}

export function bindSectionManager({state,t,saveState,showToast,render}){
  const form=document.querySelector('#sectionForm');
  form?.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(form),name=String(data.get('name')||'').trim(),code=String(data.get('code')||'').trim()||`SEC-${String(list(state.sites).length+1).padStart(3,'0')}`;
    const lat=Number(data.get('lat')||24.7136),lng=Number(data.get('lng')||46.6753),radius=Math.max(50,Number(data.get('radius')||250));
    if(!name||!Number.isFinite(lat)||!Number.isFinite(lng)){showToast(t('sections.invalid'));return;}
    const site={id:`site-${Date.now()}`,name,code,lat,lng,radius,boundary:[],projectId:String(data.get('projectId')||state.projects?.[0]?.id||'')};
    state.sites=list(state.sites);state.sites.push(site);saveState();showToast(t('sections.created'));render();
  });
  document.querySelectorAll('[data-section-delete]').forEach(button=>button.addEventListener('click',()=>{
    const site=state.sites.find(item=>item.id===button.dataset.sectionDelete);if(!site)return;
    state.sites=state.sites.filter(item=>item.id!==site.id);state.users.forEach(user=>{if(user.site===site.name)user.site='';});saveState();showToast(t('sections.deleted'));render();
  }));
}

export function routeManagerMarkup({state,t,esc}){
  const sites=list(state.sites),routes=list(state.patrolRoutes);
  const siteOptions=sites.map(site=>`<option value="${esc(site.id)}">${esc(site.name)}</option>`).join('');
  const rows=routes.length?routes.map(route=>{const site=sites.find(item=>item.id===route.siteId);return `<div class="route-row"><div><strong>${esc(route.name)}</strong><small>${esc(site?.name||t('common.unassigned'))} · ${route.checkpoints.length} ${t('routes.checkpoints')}</small><p>${route.checkpoints.map(point=>esc(point)).join(' · ')}</p></div><button class="btn btn-outline" type="button" data-route-delete="${esc(route.id)}">${t('common.delete')}</button></div>`}).join(''):`<div class="empty-state">${t('routes.empty')}</div>`;
  return `<div class="card route-manager-card"><div class="card-head"><div><h3>${t('routes.title')}</h3><small>${t('routes.subtitle')}</small></div><span class="pill dark">${routes.length} ${t('adminCenter.routes')}</span></div><form id="routeForm" class="form-grid"><div class="field"><label for="routeName">${t('routes.name')}</label><input id="routeName" name="name" required placeholder="${t('routes.namePlaceholder')}"></div><div class="field"><label for="routeSite">${t('routes.site')}</label><select id="routeSite" name="siteId">${siteOptions||`<option value="">${t('common.unassigned')}</option>`}</select></div><div class="field full"><label for="routeCheckpoints">${t('routes.checkpoints')}</label><textarea id="routeCheckpoints" name="checkpoints" rows="4" required placeholder="${t('routes.checkpointsPlaceholder')}"></textarea></div><div class="header-actions full"><button class="btn btn-primary" type="submit">+ ${t('routes.add')}</button></div></form><div class="route-list">${rows}</div></div>`;
}

export function bindRouteManager({state,t,saveState,showToast,render}){
  state.patrolRoutes=list(state.patrolRoutes);
  const form=document.querySelector('#routeForm');
  form?.addEventListener('submit',event=>{
    event.preventDefault();
    const data=new FormData(form),name=String(data.get('name')||'').trim(),checkpoints=String(data.get('checkpoints')||'').split(/\n|،|,/).map(value=>value.trim()).filter(Boolean);
    if(!name||!checkpoints.length){showToast(t('routes.invalid'));return;}
    state.patrolRoutes.unshift({id:`route-${Date.now()}`,name,siteId:String(data.get('siteId')||''),checkpoints,createdAt:new Date().toISOString()});state.patrolRoutes=state.patrolRoutes.slice(0,100);saveState();showToast(t('routes.created'));render();
  });
  document.querySelectorAll('[data-route-delete]').forEach(button=>button.addEventListener('click',()=>{state.patrolRoutes=state.patrolRoutes.filter(route=>route.id!==button.dataset.routeDelete);saveState();showToast(t('routes.deleted'));render();}));
}
