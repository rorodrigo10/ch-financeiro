(()=>{
'use strict';
const $=id=>document.getElementById(id);
const APP=new URL('./index.html',location.href).href;
const CFG=window.CH_CLOUD_CONFIG||{};
const DOMAIN='ch-financeiro.example.com';
const VALID_USERNAME=/^[a-z][a-z0-9_]{2,23}$/;
const formatUser=value=>value.trim().toLowerCase();
const toIdentity=user=>formatUser(user)+'@'+DOMAIN;
let api=null,busy=false,mode='login';
const notice=(message='',good=false)=>{$('notice').textContent=message;$('notice').classList.toggle('ok',good)};
function enter(kind='app'){sessionStorage.setItem('ch_entry_mode_v1',kind);location.replace(APP)}
function setBusy(value){busy=value;$('submitButton').disabled=value;$('switchMode').disabled=value;$('submitButton').textContent=value?'Aguarde…':mode==='register'?'Criar conta':'Entrar'}
function show(next,message='',success=false){
 mode=next;
 const reg=mode==='register';
 $('heading').textContent=reg?'Crie sua conta':'Bem-vindo de volta';
 $('lead').textContent=reg?'Escolha seu usuário e senha. Seus lançamentos serão privados e sincronizados pela nuvem.':'Entre com seu usuário e senha para acessar suas finanças no celular e no computador.';
 $('switchMode').textContent=reg?'Entrar':'Criar conta';
 $('registerSwitch').firstChild.textContent=reg?'Já tem uma conta? ':'Não tem uma conta? ';
 $('confirmGroup').hidden=!reg;
 $('confirmPassword').required=reg;
 $('password').autocomplete=reg?'new-password':'current-password';
 $('password').value='';$('confirmPassword').value='';
 document.title=reg?'Ch — Criar conta':'Ch — Entrar';
 setBusy(false);notice(message,success);
}
const explain=error=>{
 const s=String(error?.message||error||'').toLowerCase();
 if(s.includes('invalid login credentials')||s.includes('email not confirmed'))return 'Usuário ou senha inválidos. Se ainda não se cadastrou, escolha Criar conta.';
 if(s.includes('user already registered')||s.includes('already registered')||s.includes('already exists'))return 'Não foi possível cadastrar esse usuário. Experimente outro nome ou faça login.';
 if(s.includes('signup')&&s.includes('disabled'))return 'Cadastros bloqueados no Supabase. O administrador precisa ativar Allow new users to sign up.';
 if(s.includes('rate limit')||s.includes('too many'))return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
 if(s.includes('weak password')||s.includes('password should'))return 'Use uma senha mais forte (pelo menos 8 caracteres).';
 return 'Não foi possível concluir: '+(error?.message||'Verifique sua conexão.');
};
async function init(){
 show('login');
 if(!window.supabase?.createClient||!CFG.url||!CFG.publishableKey){notice('Não foi possível carregar o serviço de login. Verifique sua conexão.');return}
 api=window.supabase.createClient(CFG.url,CFG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 try{
  const {data,error}=await api.auth.getSession();if(error)throw error;
  if(data.session?.user){
   const r=await api.auth.getUser();
   if(!r.error&&r.data?.user){enter();return}
  }
 }catch(err){notice(explain(err))}
}
$('authForm').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 if(!api)return notice('Serviço de login indisponível. Recarregue a página.');
 const username=formatUser($('username').value),password=$('password').value;
 if(!VALID_USERNAME.test(username))return notice('Usuário: de 3 a 24 caracteres, começando por uma letra. Use letras, números ou _.');
 if(password.length<8)return notice('A senha deve ter pelo menos 8 caracteres.');
 if(mode==='register'&&password!==$('confirmPassword').value)return notice('As duas senhas precisam ser iguais.');
 setBusy(true);notice('');
 try{
  const email=toIdentity(username);
  if(mode==='login'){
   const {data,error}=await api.auth.signInWithPassword({email,password});if(error)throw error;
   if(!data?.user||data.user.email?.toLowerCase()!==email)throw Error('Conta autenticada não corresponde ao usuário digitado.');
   $('password').value='';$('confirmPassword').value='';enter();return;
  }
  const {data,error}=await api.auth.signUp({email,password});if(error)throw error;
  if(data?.session?.user){
   if(data.session.user.email?.toLowerCase()!==email)throw Error('Identidade de cadastro inesperada.');
   $('password').value='';$('confirmPassword').value='';enter();return;
  }
  show('login','Não foi possível entrar após o cadastro. O Supabase talvez exija confirmação por e-mail ou este nome já esteja indisponível. Para cadastro sem e-mail real, o administrador deve desativar Confirm email em Authentication → Providers → Email. Depois tente entrar ou use outro nome.');
 }catch(err){notice(explain(err))}
 finally{setBusy(false)}
});
$('switchMode').addEventListener('click',()=>show(mode==='login'?'register':'login'));
$('showPassword').addEventListener('click',()=>{const p=$('password');p.type=p.type==='password'?'text':'password';$('showPassword').textContent=p.type==='password'?'Mostrar':'Ocultar'});
$('guest').addEventListener('click',()=>enter('local'));
init();
})();