# Bikes — Locadora de Bicicletas

API REST do projeto final de locadora de bicicletas, com Spring Boot, JPA, MySQL, autenticação JWT e documentação OpenAPI 3.1 / Swagger 3. O projeto dá continuidade às atividades de Usuário e Cliente e implementa os requisitos 4, 5, 6, 7 e 8.

## Requisitos implementados

| Requisito | Implementação |
| --- | --- |
| 4 — Cliente | Cadastro autenticado com nome completo e CPF único, vínculo de um cliente por usuário, consulta dos próprios dados e consultas administrativas |
| 5 — Bicicleta | Cadastro e consulta por código único, independente do ID; status LIVRE, OCUPADA e MANUTENCAO; operações exclusivas de ADMIN |
| 6 — Locações | Solicitação por cliente cadastrado, verificação de disponibilidade, validação do cartão, retirada e devolução prevista, reserva exclusiva da bicicleta |
| 7 — Devoluções | Devolução efetiva, duração, cálculo do valor, finalização da locação e liberação ou encaminhamento para manutenção |
| 8 — Relatório | Relação administrativa de locações com cliente, bicicleta, datas, duração, status e valor |

Usuário, Cliente, Bicicleta e Locação possuem auditoria automática com `dataCriacao`, `dataModificacao`, `criadoPor` e `modificadoPor`. A aplicação usa o fuso `America/Sao_Paulo` e o locale `pt_BR`.

## Tecnologias

- Java 25 ou superior e Spring Boot 4.1.1.
- Spring Web MVC, Spring Data JPA e Hibernate.
- Spring Security, JWT assinado com HMAC SHA-256 e senhas BCrypt.
- Bean Validation e MapStruct.
- MySQL para execução e H2 para testes.
- SpringDoc OpenAPI 3.1 e Swagger 3.
- JUnit e WebTestClient para testes HTTP de ponta a ponta.

## Executar a aplicação

Crie o banco `bikes` no MySQL. O Maven Wrapper está incluído no repositório.

```bash
git clone https://github.com/lcsrj/bikes-testes-alteracao-senha.git
cd bikes-testes-alteracao-senha
```

No PowerShell:

```powershell
$env:JAVA_HOME = 'C:\caminho\do\jdk-25'
$env:SPRING_DATASOURCE_URL = 'jdbc:mysql://localhost:3306/bikes'
$env:SPRING_DATASOURCE_USERNAME = 'seu_usuario'
$env:SPRING_DATASOURCE_PASSWORD = 'sua_senha'
$env:BIKES_VALOR_HORA = '10.00'
.\mvnw.cmd spring-boot:run
```

No Linux ou macOS, configure as mesmas variáveis de ambiente e execute `bash mvnw spring-boot:run`.

O Hibernate cria e atualiza as tabelas com `ddl-auto=update`. As senhas antigas em texto puro precisam ser migradas para BCrypt antes da autenticação. Em uma base de desenvolvimento descartável, os usuários podem ser recriados pela API.

### Chave e duração do JWT

A variável `BIKES_JWT_SECRET` aceita uma chave aleatória de pelo menos 32 bytes, codificada em Base64. Para gerar uma chave:

```bash
python -c "import secrets, base64; print(base64.b64encode(secrets.token_bytes(32)).decode())"
```

Configure o resultado como variável de ambiente antes de iniciar a aplicação. Quando a variável não é definida, a aplicação gera uma chave temporária em memória; nesse caso, reiniciar a aplicação invalida os tokens anteriores. Instâncias que precisem aceitar os mesmos tokens devem usar a mesma chave.

A validade padrão do token é uma hora, configurável pela propriedade `bikes.jwt.duracao` em formato ISO-8601, por exemplo `PT1H`. A assinatura, o emissor e a expiração são validados, e o perfil atual do usuário é consultado no banco em cada requisição. HTTP Basic continua disponível para compatibilidade com as atividades anteriores; os exemplos do projeto final utilizam JWT.

## Autenticação e perfis

O cadastro de usuário é público:

```http
POST /api/v1/usuarios
Content-Type: application/json
```

```json
{
  "username": "maria@example.com",
  "password": "123456"
}
```

O perfil inicial é sempre CLIENTE. Para preparar uma conta administrativa no ambiente de desenvolvimento, cadastre o usuário pela API e atribua o perfil pelo banco:

```sql
UPDATE usuarios SET role = 'ADMIN' WHERE username = 'admin@example.com';
```

O cadastro público não permite escolher o perfil ADMIN. Depois faça login:

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "username": "maria@example.com",
  "password": "123456"
}
```

A resposta contém `accessToken`, `tokenType` e `expiresIn`. Nas rotas protegidas, envie:

```http
Authorization: Bearer <accessToken>
```

Em produção, acesse a API por HTTPS.

## Rotas

| Método | Rota | Acesso |
| --- | --- | --- |
| POST | `/api/v1/usuarios` | Público |
| POST | `/api/v1/auth/login` | Público |
| GET | `/api/v1/usuarios/{id}` | Próprio usuário ou ADMIN |
| PATCH | `/api/v1/usuarios/{id}` | Próprio usuário ou ADMIN, informando a senha atual |
| GET | `/api/v1/usuarios` | ADMIN |
| POST | `/api/v1/clientes` | CLIENTE autenticado |
| GET | `/api/v1/clientes/me` | Próprios dados de cliente |
| GET | `/api/v1/clientes/{id}` | ADMIN |
| GET | `/api/v1/clientes` | ADMIN |
| POST | `/api/v1/bicicletas` | ADMIN |
| GET | `/api/v1/bicicletas` | ADMIN |
| GET | `/api/v1/bicicletas/{codigo}` | ADMIN |
| PATCH | `/api/v1/bicicletas/{codigo}/status` | ADMIN |
| POST | `/api/v1/locacoes` | CLIENTE cadastrado |
| GET | `/api/v1/locacoes/me` | Próprias locações do CLIENTE |
| GET | `/api/v1/locacoes/{id}` | Próprio cliente ou ADMIN |
| POST | `/api/v1/locacoes/{id}/devolucao` | Próprio cliente ou ADMIN |
| GET | `/api/v1/relatorios/locacoes` | ADMIN |

## Fluxo de locação

### 1. Cadastrar o cliente

Com o token do usuário CLIENTE, envie para `POST /api/v1/clientes`:

```json
{
  "nome": "Maria da Silva",
  "cpf": "52998224725",
  "telefone": "(49) 99999-9999",
  "email": "maria@example.com"
}
```

Nome e CPF são obrigatórios. Telefone e e-mail são opcionais, conforme o modelo de dados. O nome deve ter de 2 a 100 caracteres e o CPF deve conter 11 dígitos válidos, sem pontuação. O vínculo com o usuário e a auditoria são definidos pelo servidor. CPF e usuário possuem restrições de unicidade no banco.

Conforme o requisito 4, a consulta por ID é exclusiva de ADMIN. O cliente usa `/api/v1/clientes/me` para consultar os próprios dados.

### 2. Cadastrar a bicicleta

Com o token de ADMIN, envie para `POST /api/v1/bicicletas`:

```json
{
  "codigo": "BIKE-001",
  "modelo": "Mountain Bike aro 29"
}
```

O código é único, possui de 3 a 30 caracteres e aceita letras, números, hífen e sublinhado. Ele é convertido para maiúsculas. O modelo deve ter de 2 a 100 caracteres. O status inicial é LIVRE.

### 3. Solicitar uma locação

Com o token do cliente, envie para `POST /api/v1/locacoes`:

```json
{
  "codigoBicicleta": "BIKE-001",
  "dataDevolucaoPrevista": "2030-12-01T18:00:00",
  "cartao": {
    "titular": "Maria da Silva",
    "numero": "4111111111111111",
    "cvv": "123",
    "mesValidade": 12,
    "anoValidade": 2035
  }
}
```

Use uma data prevista posterior ao horário atual, no fuso da aplicação. `codigoBicicleta` é opcional: quando omitido, o sistema seleciona uma bicicleta livre. Se a bicicleta estiver ocupada ou em manutenção, ou se não houver disponibilidade, a solicitação é rejeitada.

A locação registra o cliente, a bicicleta, o horário de retirada, a devolução prevista, a tarifa por hora e o status ATIVA. O status da bicicleta passa para OCUPADA.

O exemplo usa um cartão de teste. O sistema valida número, titular, CVV e validade. Apenas os quatro últimos dígitos do cartão são persistidos; número completo e CVV não são armazenados nem devolvidos nas respostas. Não existe integração com operadora ou débito bancário: a devolução apresenta o valor a debitar, conforme o escopo do projeto.

### 4. Registrar a devolução

Envie para `POST /api/v1/locacoes/{id}/devolucao`:

```json
{
  "manutencao": false
}
```

A operação registra o horário efetivo, calcula a duração e o valor, finaliza a locação e libera a bicicleta. Se houver um problema, informe `manutencao: true`: a bicicleta ficará em MANUTENCAO e não poderá ser alugada até ser liberada por ADMIN.

Uma locação finalizada não pode ser devolvida novamente. O cliente não pode consultar ou devolver locações de outra pessoa.

### 5. Consultar o relatório

Com token de ADMIN, use `GET /api/v1/relatorios/locacoes`. O retorno contém:

- Identificador da locação e nome do cliente.
- Código da bicicleta.
- Datas de retirada, devolução prevista e devolução efetiva.
- Duração em segundos.
- Status ATIVA ou FINALIZADA e valor final.

Sem filtro, o relatório inclui todas as locações. Para filtrar, envie `?status=ATIVA` ou `?status=FINALIZADA`. Nas locações ativas, a duração é calculada até o momento da consulta; devolução efetiva e valor final permanecem nulos.

## Tarifa e controle de disponibilidade

O enunciado não define a tarifa. O valor padrão adotado é R$ 10,00 por hora, configurável por `BIKES_VALOR_HORA`. A tarifa da retirada é armazenada na locação, preservando o valor contratado.

A cobrança é proporcional aos segundos completos de uso, com mínimo de 60 segundos e arredondamento monetário de duas casas decimais:

```text
valor = valorHora × max(60, duracaoSegundos) ÷ 3600
```

Com tarifa de R$ 10,00/h, 30 minutos custam R$ 5,00 e 2 horas custam R$ 20,00. Uma devolução imediata tem cobrança mínima de R$ 0,17.

Reservas, devoluções e alterações de status usam transações e bloqueios de escrita. A coluna única `bicicleta_ativa_id` oferece uma garantia adicional no banco contra duas locações ativas da mesma bicicleta. Na devolução, esse vínculo é liberado e o histórico continua associado à bicicleta.

ADMIN pode mudar uma bicicleta livre para MANUTENCAO e liberá-la com LIVRE pela rota de status. Uma bicicleta em locação não pode ser liberada manualmente. OCUPADA é definido somente pelo fluxo de locação.

## Validação e documentação

| Código | Situação |
| --- | --- |
| 400 | JSON, enum ou formato inválido |
| 401 | Credenciais inválidas, autenticação ausente ou JWT inválido/expirado |
| 403 | Perfil sem permissão ou acesso a dados de outro cliente |
| 404 | Recurso não encontrado |
| 409 | Duplicidade, falta de disponibilidade, cliente ainda não cadastrado ou locação já finalizada |
| 422 | Campos inválidos, cartão vencido ou devolução prevista inválida |

Os erros seguem o formato `ErrorMessage`, com mensagens por campo nas falhas de validação.

- [Swagger UI](http://localhost:8080/docs-bikes.html)
- [Documento OpenAPI 3.1](http://localhost:8080/docs-bikes)

No Swagger UI, faça login na operação de autenticação e use **Authorize** em `bearerAuth`, informando o token recebido.

## Testes e empacotamento

Os testes HTTP usam H2 em memória e portas aleatórias, sem depender de MySQL. As verificações de duração e cobrança usam um relógio controlado, sem pausas artificiais.

```powershell
.\mvnw.cmd -B -ntp clean verify
```

No Linux ou macOS:

```bash
bash mvnw -B -ntp clean verify
```

A suíte mantém os testes de Usuário e Cliente e inclui `LocadoraIT` para os requisitos finais. A cobertura abrange JWT e expiração, perfis de acesso, frota, disponibilidade, cartão, locação, devolução, cálculo de valor, manutenção, relatório, restrições do banco e requisições concorrentes de locação e devolução.

| Classe | Testes |
| --- | ---: |
| `UsuarioIT` | 5 |
| `UsuarioSenhaTest` | 24 |
| `ClienteIT` | 37 |
| `ClienteTest` | 2 |
| `LocadoraIT` | 47 |
| **Total** | **115** |

A execução validada termina com `BUILD SUCCESS`, sem falhas, erros ou testes ignorados.

Os relatórios ficam em `target/surefire-reports/`. O JAR executável é gerado em `target/bikes-0.0.1-SNAPSHOT.jar`. O workflow do GitHub executa `clean verify` em pushes e pull requests com Java 25.

## Atividades anteriores

- **Atividade 1:** alteração de senha com senha atual, nova senha e confirmação, usando `UsuarioSenhaDTO`.
- **Atividade 2:** testes de alteração de senha, incluindo sucesso, senha atual incorreta, confirmação diferente e campos inválidos.
- **Atividade 3:** cadastro autenticado de Cliente, CPF único, auditoria e controle de acesso.

A alteração de senha continua em `PATCH /api/v1/usuarios/{id}`. Os três campos devem ter exatamente seis caracteres. A senha é armazenada com BCrypt, e as requisições seguintes devem autenticar com a nova senha ou obter um novo JWT no login.
