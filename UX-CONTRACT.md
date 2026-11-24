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
| CRUD | `api.js` e roteamento de `app.js` | API e este contrato | Criar e consultar; situação, senha, devolução e exclusão de bicicletas | `tests/browser.mjs` |

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

Não há edição de nome/CPF, mudança de perfil de acesso, exclusão de usuários/clientes, cancelamento, cobrança real ou recuperação de senha por e-mail. A interface expõe os recursos existentes sem simular ações concluídas. A troca de senha segue o contrato atual da API e não revoga automaticamente tokens já emitidos.

## Demonstração estática

`assets/runtime.js` mantém o modo API como padrão. O build de Pages ativa DEMO somente em `dist/`. `api.js` encaminha as operações ao adaptador `demo.js`, que compartilha uma única base entre cliente e administrador e serializa operações. A demonstração é identificada na tela de acesso, no cabeçalho e no rodapé.

Os acessos rápidos abrem os perfis fictícios sem depender da senha atual das contas de exemplo; o login manual continua validando a senha. Senhas de teste são armazenadas como resumo, tokens ficam em memória e dados completos de cartão não são salvos. Isso é uma simulação local, não um mecanismo de segurança de produção.

O armazenamento local é exclusivo da chave `bikes.demo.v1`. Restaurar exemplos exige confirmação e altera apenas essa chave. A navegação, os campos, as notificações e as confirmações reutilizam os mesmos componentes. Fechar um diálogo remove seu conteúdo para evitar campos e IDs duplicados na tela seguinte. O teste `tests/demo-browser.mjs` verifica o fluxo completo sem servidor e os caminhos do subdiretório do repositório.

## Relatório completo

A variante administrativa da tabela compartilhada mostra cliente em coluna própria, bicicleta, retirada, devolução efetiva, duração com segundos e status, além de locação, valor e detalhes. A devolução ativa é identificada como pendente; a duração é calculada ao consultar e pode ser renovada em Atualizar relatório. A demonstração calcula o tempo decorrido como a API. No celular, todas as colunas permanecem na região de rolagem, com orientação textual. `tests/demo-browser.mjs` verifica as colunas, os dados finalizados e ativos e a rolagem sem alargar a página.

## Modelo e exclusão de bicicleta

O catálogo autenticado do cliente contém modelo e quantidade livre. O select nativo reutiliza os campos compartilhados. Escolher modelo limpa o código manual; digitar um código limpa o modelo. Atualizar modelos mantém os demais campos, inclusive os do cartão. A reserva revalida a disponibilidade e o comprovante identifica o modelo.

Excluir bicicleta fica nos detalhes administrativos e é desabilitado enquanto estiver em uso. A confirmação informa que frota e catálogo serão atualizados, histórico mantido e código reservado. O formulário de situação fica inerte durante a confirmação; cancelar restaura a interação e preserva seus valores. Durante o envio, ações e Escape são bloqueados. Sucesso fecha o diálogo, atualiza a lista e confirma a exclusão. Erros mantêm a confirmação aberta. A exclusão é lógica por `ativo`, com consulta bloqueada por código e reservas impedidas para o registro excluído.

Se o modelo selecionado deixa de estar disponível durante uma atualização, a escolha é mantida e identificada como indisponível. O envio pede uma nova escolha explícita e não troca silenciosamente para seleção automática.

## Exportação administrativa em PDF

Em Locações e relatórios, o ADMIN encontra Baixar PDF completo ao lado da atualização. As ações usam os botões compartilhados e se acomodam em linhas no celular. Uma nota informa que o arquivo reúne todas as categorias administrativas e ignora os filtros e a paginação da tela.

Durante a coleta e a geração, o botão fica desabilitado, exibe Gerando PDF… e usa aria-busy. A navegação segue o bloqueio compartilhado de operações em andamento. Notificações anunciam preparo, sucesso ou falha; uma falha libera nova tentativa e não baixa um arquivo parcial. O acesso é conferido novamente antes do download. Consultas de detalhes têm concorrência máxima de três; as listas usam os endpoints administrativos existentes.

O PDF A4 horizontal usa Manrope, verde da marca, tabelas com cabeçalhos repetidos, quebra de linha e páginas numeradas. Reúne resumo, locações/devoluções, clientes com auditoria, frota atual com auditoria e contas sem credenciais. Cartões mostram apenas quatro dígitos. A demonstração é identificada no arquivo. Horários locais preservam o fuso da aplicação; consultas não constituem um instantâneo transacional. Os testes de navegador exportam bases completas, vazias e extensas e verificam acesso, celular e recuperação de falha.
