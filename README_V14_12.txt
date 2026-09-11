Minha Loja V14.12
Correção do símbolo de moeda nos PDFs/extratos.

Correção principal:
- O PDF estava convertendo "R$" em "RR" por causa da rotina de limpeza de caracteres.
- A rotina agora preserva o símbolo "$", mantendo "R$ 10,00" corretamente.
- Impressões HTML continuam usando a formatação monetária brasileira.

Base: V14.11.
Todas as funções existentes foram preservadas.
