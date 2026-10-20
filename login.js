(()=>{
'use strict';
const $=id=>document.getElementById(id);
const ROOT=new URL('./',location.href).href;
const APP=new URL('./index.html',location.href).href;
const CFG=window.CH_CLOUD_CONFIG||{};
let api,mode='login',busy=false,recoveryLink=false;
const notice=(message='',kind='error')=>{const n=$('notice');n.textContent=message;n.classList.toggle('ok',kind==='ok')};
const busySet=b=>{busy=b;$('submitButton').disabled=b;$('submitButton').textContent=b?'Aguarde...':({login:'Entrar',register:'Criar conta',forgot:'Enviar link de recuperação',reset:'Salvar nova senha'})[mode]};
function enter(kind='app'){sessionStorage.setItem('ch_entry_mode_v1',kind);location.replace(APP)}
function show(next,message='',kind='error'){
 mode=next;
 const mapping={
 login:['Bem-vindo ao Ch','Entre para acompanhar suas finanças no celular e no computador.','Não tem conta?','Criar conta'],
 register:['Crie sua conta','Organize suas finanças e sincronize seus lançamentos.','Já tem conta?','Entrar'],
 forgot:['Recuperar senha','Enviaremos um link de recuperação para o seu e-mail.','Lembrou sua senha?','Voltar para entrar'],
 reset:['Nova senha','Escolha uma nova senha para sua conta.','','']};
 const m=mapping[mode];
 $('heading').textContent=m[0];$('subtitle').textContent=m[1];
 $('emailGroup').hidden=mode==='reset';$('passwordGroup').hidden=mode==='forgot';
 $('forgotLink').hidden=mode!=='login';
 $('confirmGroup').hidden=!(mode==='register'||mode==='reset');
 $('switcher').hidden=mode==='reset';
 if(mode!=='reset'){$('switcher').replaceChildren(document.createTextNode(m[2]+' '),$('switchMode'));$('switchMode').textContent=m[3]}
 $('email').required=mode!=='reset';
 $('password').required=mode!=='forgot';
 $('password').autocomplete=mode==='login'?'current-password':'new-password';
 $('passwordConfirm').required=mode==='register'||mode==='reset';
 busySet(false);notice(message,kind);
 document.title='Ch — '+({login:'Entrar',register:'Cadastrar',forgot:'Recuperar senha',reset:'Nova senha'})[mode];
}
function explain(error){
 const msg=String(error?.message||error||'').toLowerCase();
 if(msg.includes('invalid login credentials'))return 'E-mail ou senha incorretos. Caso ainda não tenha conta, clique em Criar conta.';
 if(msg.includes('email not confirmed'))return 'Confirme seu e-mail antes de entrar. Verifique também o spam.';
 if(msg.includes('rate limit')||msg.includes('too many'))return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
 if(msg.includes('already registered'))return 'Essa conta já existe. Tente entrar ou recuperar a senha.';
 return error?.message||'Não foi possível concluir. Verifique sua conexão.';
}
function hasRecovery(){
 const hash=new URLSearchParams(location.hash.replace(/^#/,'')).get('type');
 const query=new URLSearchParams(location.search).get('type');
 return hash==='recovery'||query==='recovery';
}
async function init(){
 show('login');
 if(!window.supabase?.createClient||!CFG.url||!CFG.publishableKey){notice('O serviço de login não carregou. Atualize a página ou continue no modo local.');return}
 api=window.supabase.createClient(CFG.url,CFG.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 recoveryLink=hasRecovery();
 api.auth.onAuthStateChange((event)=>{
  if(event==='PASSWORD_RECOVERY'){
   recoveryLink=true;setTimeout(()=>show('reset','Digite e confirme sua nova senha.','ok'),0);
  }
 });
 try{
  const {data,error}=await api.auth.getSession();if(error)throw error;
  if(recoveryLink&&data.session){show('reset','Defina sua nova senha para continuar.','ok');return}
  if(data.session?.user){
   const verified=await api.auth.getUser();
   if(!verified.error&&verified.data?.user){enter();return}
  }
  const e=new URLSearchParams(location.hash.replace(/^#/,'')).get('error_description')||new URLSearchParams(location.search).get('error_description');
  if(e)notice('O link de confirmação expirou ou não pôde ser validado. Solicite outro link.');
 }catch(err){notice('Não foi possível verificar seu acesso: '+explain(err))}
}
$('authForm').addEventListener('submit',async e=>{
 e.preventDefault();if(busy)return;
 if(!api)return notice('Serviço de login indisponível. Atualize a página.');
 const email=$('email').value.trim(),password=$('password').value,confirmation=$('passwordConfirm').value;
 if((mode==='register'||mode==='reset')&&password!==confirmation)return notice('As senhas digitadas são diferentes.');
 if((mode==='register'||mode==='reset')&&password.length<8)return notice('Use uma senha com pelo menos 8 caracteres.');
 busySet(true);notice('');
 try{
  if(mode==='login'){
   const {data,error}=await api.auth.signInWithPassword({email,password});if(error)throw error;
   if(!data?.user)throw Error('Não foi possível iniciar a sessão.');
   enter();return;
  }
  if(mode==='register'){
   const {data,error}=await api.auth.signUp({email,password,options:{emailRedirectTo:ROOT}});if(error)throw error;
   if(data?.session?.user){enter();return}
   show('login','Cadastro solicitado! Confirme seu e-mail (verifique também o spam) e entre no Ch.','ok');return;
  }
  if(mode==='forgot'){
   const {error}=await api.auth.resetPasswordForEmail(email,{redirectTo:ROOT});if(error)throw error;
   show('login','Se existir uma conta nesse e-mail, você receberá um link de recuperação. Confira sua caixa de entrada.','ok');return;
  }
  if(mode==='reset'){
   const {error}=await api.auth.updateUser({password});if(error)throw error;
   recoveryLink=false;await api.auth.signOut();
   history.replaceState(null,'',location.pathname);
   $('password').value='';$('passwordConfirm').value='';
   show('login','Senha alterada! Entre com a nova senha.','ok');return;
  }
 }catch(err){notice(explain(err))}
 finally{busySet(false)}
});
$('switchMode').addEventListener('click',()=>{
 $('password').value='';$('passwordConfirm').value='';
 if(mode==='login')show('register');else show('login');
});
$('forgotLink').addEventListener('click',()=>{$('password').value='';show('forgot')});
$('showPassword').addEventListener('click',()=>{
 const input=$('password');input.type=input.type==='password'?'text':'password';
 $('showPassword').textContent=input.type==='password'?'Mostrar':'Ocultar';
});
$('guest').addEventListener('click',()=>enter('local'));
init();
})();