(()=>{
'use strict';
const $=id=>document.getElementById(id);
const APP=new URL('./index.html',location.href).href;
const CFG=window.CH_CLOUD_CONFIG||{};
// Identificador técnico para uma única conta Supabase, NÃO é um e-mail real.
const INTERNAL_AUTH_EMAIL='rodrigo@ch-financeiro.example.com';
let api=null,busy=false;
function notice(msg=''){const el=$('notice');el.textContent=msg;el.classList.remove('ok')}
function enter(kind='app'){sessionStorage.setItem('ch_entry_mode_v1',kind);location.replace(APP)}
function setBusy(value){busy=value;$('submitButton').disabled=value;$('submitButton').textContent=value?'Entrando…':'Entrar'}
function explain(error){
 const msg=String(error?.message||error||'').toLowerCase();
 if(msg.includes('invalid login credentials')||msg.includes('email not confirmed'))return 'Usuário ou senha inválidos, ou a conta Rodrigo ainda não foi criada no Supabase. Verifique a senha e o cadastro em Authentication → Users.';
 if(msg.includes('rate limit')||msg.includes('too many'))return 'Muitas tentativas. Aguarde um pouco antes de tentar novamente.';
 return 'Não foi possível entrar: '+(error?.message||'Verifique a conexão.');
}
async function init(){
 if(!window.supabase?.createClient||!CFG.url||!CFG.publishableKey){notice('O serviço de login não carregou. Atualize a página ou continue no modo local.');return}
 api=window.supabase.createClient(CFG.url,CFG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 try{
  const {data,error}=await api.auth.getSession();if(error)throw error;
  if(data.session?.user?.email?.toLowerCase()===INTERNAL_AUTH_EMAIL){
   const {data:verified,error:err}=await api.auth.getUser();
   if(!err&&verified?.user?.email?.toLowerCase()===INTERNAL_AUTH_EMAIL){enter();return}
  }
  if(data.session?.user&&data.session.user.email?.toLowerCase()!==INTERNAL_AUTH_EMAIL){
   notice('Há uma sessão de uma conta anterior. Para usar o perfil Rodrigo, entre com sua senha. Os dados da outra conta não migram automaticamente.');
  }
 }catch(e){notice(explain(e))}
}
$('authForm').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 if(!api)return notice('Serviço de login indisponível. Atualize a página.');
 const password=$('password').value;
 if(password.length<8)return notice('Informe uma senha com pelo menos 8 caracteres.');
 setBusy(true);notice();
 try{
  const {data,error}=await api.auth.signInWithPassword({email:INTERNAL_AUTH_EMAIL,password});
  if(error)throw error;
  if(!data?.user||data.user.email?.toLowerCase()!==INTERNAL_AUTH_EMAIL){await api.auth.signOut();throw Error('A conta retornada não corresponde ao usuário Rodrigo.')}
  $('password').value='';enter();
 }catch(err){notice(explain(err));$('password').value=''}
 finally{setBusy(false)}
});
$('showPassword').addEventListener('click',()=>{const p=$('password');p.type=p.type==='password'?'text':'password';$('showPassword').textContent=p.type==='password'?'Mostrar':'Ocultar'});
$('guest').addEventListener('click',()=>enter('local'));
init();
})();