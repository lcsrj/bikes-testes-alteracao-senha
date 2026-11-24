# Contrato de interface

O contrato do domínio está no README e na API. As permissões continuam sendo verificadas pelo servidor. Este documento descreve o comportamento compartilhado da interface.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | `ui.js`, `app.js`, select nativo | Este contrato e DESIGN.md | Filtros, paginação e situação; popup do navegador | `tests/browser.mjs` |
| Date | `ui.js`: `date`, `localNow`, `zonedInstant`; datetime-local nativo | API e este contrato | Formatação brasileira e entrada no fuso do servidor | `tests/ui.test.mjs`, `tests/browser.mjs` |
| Form | `ui.js`: `field`, `password`, `showError`; `app.js`: `attachForms` | Este contrato | Cadastro, login, locação, senha e manutenção | `tests/browser.mjs` |
| Scrollbar | `styles.css`: `.table-scroll` e `dialog` | DESIGN.md | Tabela e diálogo, geometria nativa | Verificação visual em computador e celular |
| Toast | `ui.js`: `toast`; região `#toast` | Este contrato | Confirmação e informação, anúncio polite | `tests/browser.mjs` |
| CRUD | `api.js` e roteamento de `app.js` | API e este contrato | Criar e consultar; situação, senha e devolução; sem exclusão | `tests/browser.mjs` |

## Sessão e rotas

O JWT fica somente em memória. Recarregar ou fechar a página exige novo login. Nenhuma senha, token ou cartão é salvo no armazenamento do navegador. O servidor informa o usuário atual em `/api/v1/auth/me` e a tarifa/fuso em `/api/v1/configuracao`.

Hash routes preservam a sessão durante a navegação. O cliente acessa início, perfil, locações, nova locação e conta. O administrador acessa início, bicicletas, clientes, usuários, relatórios e conta. Links fora da área do usuário exibem uma tela explicativa. Uma resposta 401 encerra a sessão e limpa a tela; 403 consulta novamente o perfil de acesso e informa a recusa.

## Formulários e confirmações

Cada campo tem rótulo. A validação compartilhada usa as restrições HTML e apresenta mensagens próprias em português, com foco no primeiro campo inválido. A API continua sendo a validação definitiva, incluindo CPF único, cartão, disponibilidade e senha atual. Erros de negócio e rede preservam os valores enquanto a sessão estiver válida.

O botão de envio fica desabilitado enquanto a operação está em andamento; uma falha incerta de conexão orienta conferir os dados antes de repetir uma alteração. O sistema não repete automaticamente gravações. Campos do cartão são apagados após uma locação confirmada.

Sair de um formulário alterado exige confirmação. Diálogos podem ser fechados por botão ou Escape; durante o envio o fechamento é bloqueado. A devolução é confirmada no diálogo de detalhes, com opção explícita de manutenção e comprovante após o sucesso. A situação OCUPADA não pode ser escolhida manualmente.

## Listas e estados

Buscas, filtros e página ficam no hash da URL; não contêm credenciais. Alterar busca/filtro volta à primeira página. Resultados usam paginação local de 10, 20 ou 50 itens porque a API atual retorna listas completas. Isso limita o volume renderizado, mas não o volume transferido; paginação no servidor será necessária para bases grandes.

Cada consulta possui carregamento, lista vazia e falha recuperável. A navegação mantém a estrutura do painel. Tabelas largas rolam dentro da própria região. No celular o menu é recolhível e mantém as mesmas opções e ordem. Controles de data e select mantêm a interação nativa do navegador.

## Limites

Não há edição de nome/CPF, mudança de perfil de acesso, exclusão, cancelamento, cobrança real ou recuperação de senha por e-mail. A interface expõe os recursos existentes sem simular ações concluídas. A troca de senha segue o contrato atual da API e não revoga automaticamente tokens já emitidos.
