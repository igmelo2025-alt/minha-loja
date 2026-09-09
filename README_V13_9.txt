Minha Loja V13.9 — Sincronização online corrigida

Base: V13.8.

Correção principal:
- Compatibilidade com a chave pública Supabase no formato sb_publishable_.
- Chamadas REST do app_backups enviam a chave no cabeçalho apikey.
- Mantidos os recursos de sincronização entre dispositivos, backup na nuvem, vendas, estoque, usuários e demais funções da V13.8.

Configuração do Supabase:
- A tabela public.app_backups continua sendo usada.
- Não é necessário criar outra tabela para esta versão.
