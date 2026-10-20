# Ch Financeiro — acesso pessoal Rodrigo (v10)

O login mostra apenas **Rodrigo + senha**. Não pede e-mail nem oferece recuperação automática. A senha é validada pelo Supabase Auth, nunca pelo código público do GitHub.

## Configuração única no Supabase

1. Abra https://supabase.com/dashboard/project/tkawfrhydnvsrzpjzsco/auth/users
2. **Authentication → Users → Add user → Create new user**.
3. No campo **Email**, preencha o identificador técnico `rodrigo@ch-financeiro.example.com` (não é uma caixa de e-mail real).
4. Defina **você mesmo uma senha forte**, sem enviá-la para o ChatGPT.
5. Ative **Auto Confirm User** se o formulário tiver essa opção, depois salve.
6. Acesse https://rorodrigo10.github.io/ch-financeiro/login.html e entre como Rodrigo com sua senha.

O Supabase usa e-mail ou telefone para autenticação por senha; usamos um identificador técnico reservado como login interno. Se o serviço rejeitar esse formato, não use um e-mail que pertença a outra pessoa — peça auxílio para mudar a configuração.

## Cuidados

- Faça backup JSON antes de trocar contas. Lançamentos de uma conta anterior não são migrados automaticamente.
- Após criar Rodrigo, é recomendável desligar **Allow new users to sign up** nas configurações gerais de Authentication, preservando o provedor e-mail/senha.
- **Sem recuperação automática:** administre a senha no painel do Supabase. Excluir o usuário pode excluir seus dados na tabela `ch_user_state` devido ao relacionamento ON DELETE CASCADE. Prefira redefinir a senha; sempre faça backup.
- O acesso local sem conta não sincroniza dados.
- Não publique senhas ou chaves secretas no GitHub. O banco usa RLS.
