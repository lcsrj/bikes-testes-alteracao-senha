# Bikes — Atividade 3: Cadastro de Clientes

Projeto da disciplina com API para cadastro de usuários e clientes. A Atividade 3 adiciona o recurso `Cliente`, vinculado a um usuário cadastrado e autenticado.

## Atividade 3

### Requisitos

- Cliente com `id` (Long), `nome` (String), `cpf` (String) e método `equals`.
- CPF único e vínculo obrigatório com um usuário.
- Cadastro permitido somente para usuários autenticados.
- Cliente pode consultar apenas os próprios dados.
- Admin pode consultar os dados de todos os clientes.
- DTOs, Controller, Service e Repository.
- Validação dos campos de entrada.
- Documentação com SpringDoc OpenAPI 3.1 e Swagger 3.
- Campos de auditoria iguais aos de Usuário.

### Implementação

A entidade `Cliente` possui relacionamento `@OneToOne` com `Usuario`. O banco garante CPF único, usuário único e chave estrangeira obrigatória. Cada usuário pode ter um cliente cadastrado.

O cadastro recebe somente `nome` e `cpf`. O usuário associado é obtido da autenticação, e os campos de auditoria são preenchidos pelo servidor.

| Classe | Responsabilidade |
| --- | --- |
| `Cliente` | Entidade, vínculo com usuário, `equals` e `hashCode` |
| `ClienteRequestDTO` | Dados e validações de entrada |
| `ClienteResponseDTO` | Dados de resposta, identificação do usuário e auditoria |
| `ClienteMapper` | Conversão entre entidade e DTOs com MapStruct |
| `ClienteController` | Rotas HTTP e documentação das operações |
| `ClienteService` | Cadastro, consultas e controle de acesso |
| `ClienteRepository` | Persistência e buscas de clientes |
| `SecurityConfig` | Autenticação HTTP Basic e proteção das rotas |
| `UsuarioAtual` | Identificação do usuário autenticado |
| `EntidadeAuditavel` | Campos de auditoria compartilhados por Cliente e Usuário |
| `JpaAuditingConfig` | Preenchimento automático das datas e do responsável |

O método `equals` compara os clientes pelo ID. Objetos novos, sem ID, são distintos. O `hashCode` permanece estável após a persistência.

### Rotas e permissões

| Método | Rota | Permissão | Sucesso |
| --- | --- | --- | --- |
| POST | `/api/v1/usuarios` | Público; cria usuário com perfil CLIENTE | 201 |
| POST | `/api/v1/clientes` | Usuário autenticado; cadastro vinculado à própria conta | 201 |
| GET | `/api/v1/clientes/me` | Usuário autenticado; consulta do próprio cliente | 200 |
| GET | `/api/v1/clientes/{id}` | Próprio cliente ou ADMIN | 200 |
| GET | `/api/v1/clientes` | ADMIN | 200 |

As consultas e a alteração de senha em `/api/v1/usuarios` também exigem autenticação. O próprio usuário ou ADMIN pode consultar um usuário pelo ID e alterar sua senha, informando a senha atual. A listagem de usuários é exclusiva de ADMIN.

### Validação e erros

O nome é aparado antes da validação e deve ter de 2 a 100 caracteres. O CPF deve conter exatamente 11 dígitos, sem pontuação, e ter dígitos verificadores válidos.

| Código HTTP | Situação |
| --- | --- |
| 401 | Autenticação ausente ou credenciais inválidas |
| 403 | Consulta ou operação sem permissão |
| 404 | Cliente inexistente ou usuário ainda sem cliente cadastrado |
| 409 | CPF já cadastrado ou usuário que já possui um cliente |
| 422 | Campos de entrada inválidos |

As respostas de erro usam `ErrorMessage`. Falhas de validação incluem o campo `errors`, com a mensagem correspondente a cada campo inválido.

### Auditoria

Cliente e Usuário compartilham os campos `dataCriacao`, `dataModificacao`, `criadoPor` e `modificadoPor`. As datas são preenchidas pelo Spring Data JPA. O responsável é o e-mail do usuário autenticado; no cadastro público de usuário, o valor é `sistema`.

## Como executar

Requisitos: JDK 25 ou superior e MySQL com o banco `bikes`. O Maven Wrapper está incluído no projeto.

```bash
git clone https://github.com/lcsrj/bikes-testes-alteracao-senha.git
cd bikes-testes-alteracao-senha
```

No PowerShell, configure a conexão com o banco e inicie a aplicação:

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:mysql://localhost:3306/bikes'
$env:SPRING_DATASOURCE_USERNAME = 'seu_usuario'
$env:SPRING_DATASOURCE_PASSWORD = 'sua_senha'
.\mvnw.cmd spring-boot:run
```

No Linux ou macOS, configure as mesmas variáveis de ambiente e execute `bash mvnw spring-boot:run`.

A aplicação usa `spring.jpa.hibernate.ddl-auto=update` para criar e atualizar as tabelas. As senhas são armazenadas com BCrypt. Senhas antigas em texto puro precisam ser migradas para hashes BCrypt antes da autenticação. Em uma base de desenvolvimento descartável, os usuários podem ser recriados pela API.

O cadastro público cria apenas usuários com perfil CLIENTE. A atribuição do perfil ADMIN deve ser feita por manutenção administrativa no banco.

## Cadastro e consulta

Primeiro cadastre o usuário:

```bash
curl -X POST http://localhost:8080/api/v1/usuarios -H "Content-Type: application/json" -d '{"username":"maria@example.com","password":"123456"}'
```

Depois cadastre o cliente usando as credenciais do usuário:

```bash
curl -u maria@example.com:123456 -X POST http://localhost:8080/api/v1/clientes -H "Content-Type: application/json" -d '{"nome":"Maria da Silva","cpf":"52998224725"}'
```

Consulte os próprios dados:

```bash
curl -u maria@example.com:123456 http://localhost:8080/api/v1/clientes/me
```

No PowerShell, use `curl.exe` nesses comandos. A autenticação ocorre em cada requisição pelo cabeçalho HTTP Basic; não há endpoint separado de login. Em produção, utilize HTTPS.

## Documentação da API

- [Swagger UI](http://localhost:8080/docs-bikes.html)
- [Documento OpenAPI 3.1](http://localhost:8080/docs-bikes)

No Swagger UI, use **Authorize** e informe o e-mail e a senha de um usuário cadastrado. As operações de Cliente documentam as permissões, os DTOs e os códigos de resposta.

## Testes

Os testes de integração chamam a API HTTP em uma porta aleatória e usam H2 em memória. Não é necessário MySQL para executá-los.

Para compilar, executar todos os testes e gerar o JAR:

```powershell
.\mvnw.cmd -B -ntp clean verify
```

No Linux ou macOS:

```bash
bash mvnw -B -ntp clean verify
```

| Classe | Testes | Cobertura |
| --- | ---: | --- |
| `ClienteIT` | 37 | Cadastro, autenticação, permissões, validação, unicidade, vínculo, auditoria e documentação |
| `ClienteTest` | 2 | Contrato de `equals` e estabilidade do `hashCode` |
| `UsuarioIT` | 5 | Cadastro e consulta de usuários |
| `UsuarioSenhaTest` | 24 | Alteração de senha e validação dos três campos |
| **Total** | **68** | |

A execução deve terminar com `BUILD SUCCESS`, sem falhas, erros ou testes ignorados. Os relatórios ficam em `target/surefire-reports/`, e o pacote gerado é `target/bikes-0.0.1-SNAPSHOT.jar`.

Se ocorrer `release version 25 not supported`, configure `JAVA_HOME` para um JDK 25 ou superior.

## Atividades anteriores

### Atividade 1 — Alteração de senha

O endpoint `PATCH /api/v1/usuarios/{id}` recebe a senha atual, a nova senha e sua confirmação:

```json
{
  "senhaAtual": "123456",
  "novaSenha": "654321",
  "confirmaSenha": "654321"
}
```

Os três campos são obrigatórios e devem ter exatamente seis caracteres. A senha atual deve conferir, e a nova senha deve ser igual à confirmação. A operação retorna 204 sem corpo quando concluída, 400 quando as senhas não conferem e 422 quando os campos são inválidos. Usuário inexistente retorna 404 quando consultado por ADMIN.

### Atividade 2 — Testes de alteração de senha

A classe `UsuarioSenhaTest` verifica sucesso, senha atual incorreta, confirmação diferente e campos inválidos. Também cobre campos ausentes ou nulos, usuário inexistente e rejeição da senha antiga após a alteração. As verificações de persistência usam `PasswordEncoder.matches` para conferir o hash BCrypt.

Os testes de Usuário foram adaptados para enviar autenticação HTTP Basic. Após uma alteração de senha, as requisições seguintes usam a nova senha.
