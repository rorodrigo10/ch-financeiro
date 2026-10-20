/* Ch Cloud Sync — login e sincronização por usuário.
 * A chave usada no navegador é pública; dados protegidos por RLS no Supabase.
 */
(() => {
'use strict';
const ROOT = document.getElementById('chCloudPanel');
if (!ROOT) return;
const $c = id => document.getElementById(id);
const CONFIG_STORAGE = 'ch_cloud_public_config_v1';
const OWNER_STORAGE = 'ch_cloud_owner_v1';
const DIRTY_STORAGE = 'ch_cloud_unsynced_v1';
const EMPTY = () => ({transactions:[], messages:[], fixed:[], goals:[], purchases:[]});
const HAS_DATA = value => ['transactions','messages','fixed','goals','purchases'].some(k=>(value?.[k]?.length||0)>0);
const publicConfig = window.CH_CLOUD_CONFIG || {};
const savedConfig = (()=> {try {return JSON.parse(localStorage.getItem(CONFIG_STORAGE) || 'null')} catch {return null}})();
const cfg = publicConfig.url && publicConfig.publishableKey ? publicConfig : (savedConfig || publicConfig);
let api = null;
let currentUser = null;
let cloudRevision = 0;
let active = false;
let dirty = false;
let syncing = false;
let conflict = false;
let setupBusy = false;
let timer = null;
let lastKnown = '';
let lastSyncTime = null;
const basePersist = persist;
const saveLocal = () => basePersist();
const display = (message, stateType='') => {
 const label = $c('chCloudStatus');
 label.textContent = message;
 label.style.borderColor = stateType==='error' ? '#a44a65' : stateType==='ok' ? '#71476a' : '#603d52';
 $c('chCloudRevision').textContent = currentUser ? 'Revisão '+cloudRevision+' · '+(lastSyncTime ? 'Última sincronização: '+lastSyncTime.toLocaleTimeString('pt-BR') : 'Sem sincronização concluída') : '';
 const top = document.querySelector('header.top > span');
 if(top) top.textContent = active && !conflict ? (dirty ? '● Pendente' : '☁ Sincronizado') : 'Modo local';
};
const warn = e => {console.error('Ch Cloud:',e);return e?.message || 'Erro desconhecido'};
const validateConfig = (url,key) => {
 try {
  const u = new URL(url.trim());
  if (u.protocol !== 'https:' || !u.hostname.endsWith('.supabase.co')) throw new Error();
 } catch {throw new Error('Use a URL HTTPS do seu projeto, terminando em .supabase.co.');}
 if (!key.trim().startsWith('sb_publishable_')) throw new Error('Informe apenas a chave pública sb_publishable_… Não use secret ou service_role.');
 return {url:url.trim().replace(/\/$/,''), publishableKey:key.trim()};
};
const displayAuth = signed => {
 $c('chCloudAuth').classList.remove('hidden');
 $c('chCloudLoginForm').classList.toggle('hidden',signed);
 $c('chCloudSignedIn').classList.toggle('hidden',!signed);
 $c('chCloudUser').textContent = signed ? (currentUser?.email||'Conta autenticada') : '';
 $c('chAccountOpen').classList.toggle('hidden',signed);
};
const storePayload = () => JSON.parse(JSON.stringify({transactions:state.transactions,messages:state.messages,fixed:state.fixed,goals:state.goals,purchases:state.purchases}));
const refreshUI = () => {
 chPending=null;
 const box = document.getElementById('messages');
 box.replaceChildren();
 for (const m of state.messages) msg(m.role,m.text,false);
 chUpdateActionButtons();
 draw();
};
const setStateFromCloud = (payload, backupBeforeReplace=false) => {
 if (!validate(payload)) throw Error('O banco retornou dados inválidos. Nenhum registro foi substituído.');
 const existing = storePayload();
 if (backupBeforeReplace && HAS_DATA(existing) && JSON.stringify(existing)!==JSON.stringify(payload)) download('ch-backup-antes-da-nuvem-'+today()+'.json',JSON.stringify(existing,null,2),'application/json');
 state=JSON.parse(JSON.stringify({transactions:payload.transactions,messages:payload.messages,fixed:payload.fixed,goals:payload.goals,purchases:payload.purchases}));
 saveLocal();
 localStorage.setItem(OWNER_STORAGE,currentUser.id);
 localStorage.removeItem(DIRTY_STORAGE);
 dirty=false; conflict=false;active=true;
 lastKnown=JSON.stringify(storePayload());
 refreshUI();
};
async function readRemote(){
 const {data,error} = await api.from('ch_user_state').select('data,revision').eq('user_id',currentUser.id).maybeSingle();
 if(error) throw new Error('Falha ao ler a nuvem: '+error.message+'. Execute o SQL de configuração antes de sincronizar.');
 return data;
}
async function upload(){
 if (!api||!currentUser||!active||conflict||setupBusy) return;
 if (syncing) {dirty=true;return;}
 if (!dirty) return;
 syncing=true;
 const payload=storePayload();
 const serialized=JSON.stringify(payload);
 try {
  const {data,error}=await api.rpc('ch_save_snapshot',{p_data:payload,p_expected_revision:cloudRevision});
  if(error) throw error;
  if (!Array.isArray(data)||!data[0]?.saved){
   conflict=true;active=false;
   display('⚠️ Conflito: outro aparelho tem alterações mais recentes. Seus dados locais continuam aqui. Faça um backup e clique em “Carregar dados da nuvem” para resolver.', 'error');
   return;
  }
  cloudRevision=Number(data[0].new_revision);
  lastSyncTime=new Date();
  lastKnown=serialized;
  if(JSON.stringify(storePayload())===serialized){dirty=false;localStorage.removeItem(DIRTY_STORAGE)}
  display(dirty?'Salvando as alterações mais recentes…':'✓ Dados sincronizados com sua conta.', 'ok');
 }catch(e){display('Sem conexão com a nuvem. Seus dados continuam salvos neste navegador. Erro: '+warn(e),'error')}
 finally{
  syncing=false;
  if(dirty&&active&&!conflict&&lastKnown===serialized&&JSON.stringify(storePayload())!==serialized) schedule();
 }
}
function schedule(){if(!active||conflict)return;dirty=true;localStorage.setItem(DIRTY_STORAGE,'1');clearTimeout(timer);timer=setTimeout(upload,1200);display('● Alterações locais aguardando sincronização…')}
function localChanged(){if(!active||setupBusy||!currentUser)return;schedule()}
async function initForUser(user){
 if(setupBusy)return;
 setupBusy=true;
 clearTimeout(timer);
 currentUser=user;
 active=false;
 conflict=false;
 displayAuth(true);
 display('Consultando dados da sua conta…');
 try {
  const cloud=await readRemote();
  const local=storePayload();
  const localHas=HAS_DATA(local);
  const previousOwner=localStorage.getItem(OWNER_STORAGE);
  const unsynced=localStorage.getItem(DIRTY_STORAGE)==='1' && previousOwner===user.id;
  if(cloud){
   cloudRevision=Number(cloud.revision);
   if(unsynced&&localHas){
    conflict=true;
    display('⚠️ Há alterações locais não sincronizadas. Faça backup e escolha “Carregar dados da nuvem”. Seus registros locais não serão substituídos automaticamente.', 'error');
    return;
   }
   if (localHas && previousOwner!==user.id){
    const choice=confirm('Esta conta já tem dados na nuvem. Deseja carregar os registros online neste dispositivo? O Ch fará um backup do conteúdo local antes da troca.');
    if(!choice){display('Conectado, mas sem sincronizar. Os dados locais não serão enviados automaticamente. Escolha “Carregar dados da nuvem” quando quiser.', 'error');return;}
   }
   setStateFromCloud(cloud.data,localHas && previousOwner!==user.id);
   lastSyncTime=new Date();
   display('✓ Dados carregados da nuvem. A sincronização automática está ativa.','ok');
  } else {
   cloudRevision=0;
   const canUpload=localHas && confirm('Sua conta ainda não possui dados na nuvem. Enviar os lançamentos locais deste aparelho para criar seu primeiro backup online?');
   if(localHas&&!canUpload){display('Conta conectada, mas sem sincronização. Seus dados locais permanecem intactos.','error');return;}
   active=true;
   localStorage.setItem(OWNER_STORAGE,user.id);
   dirty=true;
   localStorage.setItem(DIRTY_STORAGE,'1');
   display('Criando seus dados na nuvem…');
  }
 }catch(e){display(warn(e),'error')}
 finally {setupBusy=false}
 if(active&&dirty)await upload();
}
async function loadCloud(){
 if(!currentUser)return display('Primeiro entre na sua conta.');
 if(!confirm('Carregar a versão da nuvem neste dispositivo? O Ch baixará um backup dos dados locais antes de substituí-los. Alterações apenas locais não serão incorporadas automaticamente.'))return;
 clearTimeout(timer);
 setupBusy=true;
 try{
  const row=await readRemote();
  if(!row) return display('Não há dados salvos nesta conta ainda.');
  cloudRevision=Number(row.revision);
  setStateFromCloud(row.data,true);
  lastSyncTime=new Date();
  display('✓ Versão mais recente da nuvem carregada.','ok');
 }catch(e){display(warn(e),'error')}
 finally{setupBusy=false}
}
async function poll(){
 if(!active||!currentUser||dirty||syncing||setupBusy||document.hidden) return;
 try {
  const remote=await readRemote();
  if(!remote||Number(remote.revision)===cloudRevision)return;
  setStateFromCloud(remote.data);
  cloudRevision=Number(remote.revision);
  lastSyncTime=new Date();
  display('✓ Atualizado com mudanças do outro dispositivo.','ok');
 }catch(e){display('Não foi possível verificar alterações do outro dispositivo: '+warn(e),'error')}
}
async function signOut(){
 if(dirty){await upload();if(dirty){download('ch-backup-nao-sincronizado-'+today()+'.json',JSON.stringify(storePayload(),null,2),'application/json');if(!confirm('Há alterações NÃO sincronizadas. O Ch baixou um backup antes de sair. Deseja sair mesmo assim?'))return;}}
 if(!confirm('Sair desta conta neste dispositivo? A cópia local dos registros será removida para proteger sua privacidade. Os dados já sincronizados permanecem online.'))return;
 clearTimeout(timer);
 active=false;conflict=false;dirty=false;
 localStorage.removeItem(DIRTY_STORAGE);
 localStorage.removeItem(OWNER_STORAGE);
 state=EMPTY();saveLocal();refreshUI();
 const {error}=await api.auth.signOut();
 if(error)display('Sessão local removida, mas houve um erro ao sair: '+warn(error),'error');
 currentUser=null;
 cloudRevision=0;
 displayAuth(false);
 display('Você saiu. Seus dados locais foram limpos deste dispositivo.','ok');
 sessionStorage.removeItem('ch_entry_mode_v1');
 location.replace('./login.html');
}
async function launch(config){
 if(!window.supabase?.createClient){display('A biblioteca de sincronização não carregou. Verifique sua conexão à internet. O Ch permanece funcional no modo local.','error');return}
 try {
  const ready=validateConfig(config.url,config.publishableKey);
  api=window.supabase.createClient(ready.url,ready.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  displayAuth(false);
  display('Projeto conectado. Entre ou crie uma conta para sincronizar.');
  const {data,error}=await api.auth.getSession();
  if(error)throw error;
  if(data.session?.user)await initForUser(data.session.user);
 }catch(e){display('Não foi possível conectar o projeto: '+warn(e),'error')}
}
$c('chCloudConfigForm').addEventListener('submit',async e=>{
 e.preventDefault();
 try{
  const conf=validateConfig($c('chCloudUrl').value,$c('chCloudKey').value);
  if(active||currentUser) return display('Saia da conta antes de trocar de projeto.','error');
  localStorage.setItem(CONFIG_STORAGE,JSON.stringify(conf));
  await launch(conf);
 }catch(err){display(err.message,'error')}
});
$c('chCloudLoginForm').addEventListener('submit',async e=>{
 e.preventDefault();
 if(!api)return display('Primeiro configure o projeto Supabase.','error');
 const email=$c('chCloudEmail').value.trim();
 const password=$c('chCloudPass').value;
 $c('chCloudPass').value='';
 display('Entrando na conta…');
 try{
  const {data,error}=await api.auth.signInWithPassword({email,password});
  if(error)throw error;
  if(!data.user)throw Error('Sessão não encontrada.');
  await initForUser(data.user);
 }catch(e){display('Não foi possível entrar: '+warn(e),'error')}
});
$c('chCloudSignup').onclick=async()=>{
 if(!api)return display('Primeiro configure o projeto Supabase.','error');
 const email=$c('chCloudEmail').value.trim();const password=$c('chCloudPass').value;
 if(!email||password.length<8)return display('Informe um e-mail e senha com pelo menos 8 caracteres.','error');
 $c('chCloudPass').value='';
 display('Criando sua conta…');
 try{
  const {data,error}=await api.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});
  if(error)throw error;
  if(data.session?.user)await initForUser(data.session.user);
  else display('Cadastro solicitado. Confirme seu e-mail e depois volte para entrar no Ch.','ok');
 }catch(e){display('Não foi possível cadastrar: '+warn(e),'error')}
};
$c('chCloudSyncNow').onclick=async()=>{
 if(!active)return display('Conectado, mas sem sincronização ativa. Primeiro carregue os dados da nuvem.','error');
 if(dirty)await upload();else await poll();
};
$c('chCloudLoad').onclick=loadCloud;
$c('chCloudLogout').onclick=signOut;
persist=()=>{basePersist();localChanged()};
window.ChCloudSync={localChanged,poll};
window.addEventListener('online',()=>{if(active&&dirty)upload();else poll()});
window.addEventListener('focus',poll);
setInterval(poll,20000);
$c('chCloudUrl').value=cfg.url||'';
$c('chCloudKey').value=cfg.publishableKey||'';
if(cfg.url&&cfg.publishableKey){launch(cfg)}else display('Modo local — configure primeiro seu projeto gratuito Supabase.');
})();