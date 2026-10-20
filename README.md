# Ch Financeiro — v11 multiusuário

Aplicativo financeiro pessoal em estilo de chat, agora com **login e cadastro por usuário e senha**. Cada pessoa usa a própria conta Supabase com registros isolados pela política RLS da tabela `public.ch_user_state`.

## Ativar o cadastro (obrigatório)

Acesse [Authentication → Providers](https://supabase.com/dashboard/project/tkawfrhydnvsrzpjzsco/auth/providers), abra **Email** e ajuste:

1. **Email** habilitado.
2. **Confirm email** desativado, para criar usuários sem e-mail real.
3. **Allow new users to sign up** ativado nas configurações gerais de Authentication.

O Supabase precisa de identificadores de login no formato e-mail. O Ch transforma o nome `maria` em `maria@ch-financeiro.example.com` **apenas internamente**, sem uma caixa postal verdadeira. O nome `Rodrigo` mantém o identificador já usado na v10. A senha é validada pelo Supabase e não aparece no código do GitHub.

## Como acessar

Abra https://rorodrigo10.github.io/ch-financeiro/login.html e clique em **Criar conta** ou **Entrar**, utilizando apenas usuário e senha. Escolha uma senha forte. No segundo dispositivo, use a **mesma conta** para sincronizar.

A sincronização atual é por cópia completa com revisão e aviso de conflito; não combina automaticamente duas edições simultâneas. Faça backup JSON antes de importar dados antigos.

## Limitações e segurança

- **Sem e-mail de recuperação:** quem esquecer a senha precisará de assistência administrativa segura e poderá perder o acesso aos dados. Não exclua a conta para redefinir a senha; a linha de dados está vinculada ao usuário e será apagada com ele por `ON DELETE CASCADE`.
- O cadastro aberto sem confirmação por e-mail é adequado somente para o **protótipo**. Para oferecer o Ch ao público, é recomendável autenticação com e-mail verificável ou mecanismo equivalente de recuperação, CAPTCHA, limites contra abuso e revisão de segurança.
- Nunca publique senhas, service_role ou chaves `sb_secret_...` no repositório.
- Ao sair, o Ch pergunta antes de remover registros locais. Perfis diferentes nunca devem ser mesclados automaticamente.


## Atualização v13 — formas de pagamento

- Chat pergunta **débito, Pix ou crédito** para cada gasto.
- Débito/Pix reduzem as movimentações de conta; crédito registra previsão na fatura.
- Cadastre **1/10**, **4/10** ou **1/1** diretamente em Cartões e parcelas.
- **Pagar fatura** registra a saída da conta sem duplicar gastos nas categorias.
- Meses e datas exibidos representam **valores informados**, não extratos bancários.
- Faça backup JSON antes de usar a nova versão ou alterar compras existentes.
