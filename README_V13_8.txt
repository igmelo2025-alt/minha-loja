Minha Loja V13.9 — Sincronização online corrigida

O aplicativo continua funcionando localmente e agora pode sincronizar os dados entre aparelhos usando a tabela app_backups do Supabase já usada pelo backup em nuvem.

PRIMEIRA CONFIGURAÇÃO
1. No aparelho que possui os dados corretos, entre em Mais > Backup na nuvem e informe a URL do projeto Supabase e a chave pública anon.
2. Em Sincronização entre dispositivos, gere um Código da loja.
3. Toque em Enviar para a nuvem.
4. No outro aparelho, abra a Minha Loja e toque em “Acessar minha loja em outro aparelho”.
5. Informe a mesma URL, chave anon e Código da loja.
6. Toque em Baixar minha loja da nuvem.
7. Depois do download, use o mesmo usuário e senha da loja original.

SINCRONIZAÇÃO AUTOMÁTICA
Depois que os aparelhos estiverem configurados, ative “Sincronização automática”. Alterações salvas serão enviadas para a nuvem após uma pequena espera. O aplicativo também verifica a nuvem ao entrar.

SEGURANÇA
- Use somente a chave pública anon no aplicativo. Nunca use service_role.
- Mantenha o RLS/políticas da tabela app_backups configurado no projeto Supabase.
- O Código da loja deve ser mantido em sigilo; ele funciona como identificador de sincronização.
- Antes da primeira sincronização, mantenha a V13.7 como backup.

OBSERVAÇÃO
A sincronização usa o modelo “última versão confirmada”. Se dois aparelhos forem alterados offline ao mesmo tempo, a versão enviada por último pode substituir a anterior. Para uso simultâneo intenso, o próximo passo recomendado é autenticação e sincronização por registros individuais.


V13.9: compatibilidade corrigida com chaves Supabase Publishable (sb_publishable_...). As chamadas REST usam a chave somente no cabeçalho apikey, conforme o formato atual das chaves do Supabase.
