# Ch Financeiro v8

Aplicativo de finanças pessoais para GitHub Pages. Interface preta/rosa, chat, registros, metas, gastos fixos, parcelas, relatórios e sincronização opcional.

## Ativar a nuvem grátis

1. Faça um **backup JSON** de seus dados atuais no Ch.
2. Abra o Supabase Dashboard do projeto `ch-financeiro`.
3. No **SQL Editor**, execute o arquivo [supabase-setup.sql](./supabase-setup.sql) completo para criar a tabela e as regras de segurança (RLS).
4. Em **Authentication > URL Configuration**, defina a **Site URL** como `https://rorodrigo10.github.io/ch-financeiro/`. Se necessário, permita o mesmo endereço em Redirect URLs.
5. Abra o [Ch publicado](https://rorodrigo10.github.io/ch-financeiro/) e vá em **Dados**: a Project URL e a chave publicável já estão configuradas.
6. Crie uma conta com e-mail e senha, confirme o e-mail se necessário e faça login. Se houver lançamentos locais, confirme o envio à nuvem somente depois de salvar seu backup.
7. No celular e no PC, abra o mesmo endereço e use **a mesma conta**. Atualização automática enquanto o app estiver aberto (~20 segundos).

### Privacidade e limitações
- A chave `sb_publishable_...` é pública, projetada para uso no browser; **não publique service_role, sb_secret, senhas ou arquivos de backup**.
- Acesso por usuário usa autenticação e RLS; sem executar o SQL a sincronização não funciona.
- O app salva uma cópia local no navegador; backup JSON continua recomendado.
- Conflitos entre alterações simultâneas são detectados e exigem intervenção, sem mesclagem automática.
- O GitHub Pages publica o código, mas **não contém seus dados financeiros**.
- O Supabase Free está sujeito a limites e suspensão por inatividade.

[Repositório](https://github.com/rorodrigo10/ch-financeiro) · [Site](https://rorodrigo10.github.io/ch-financeiro/)
