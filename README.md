# Bikes — Testes de alteração de senha

Atividade: **1 — Testes (alteração de senha)**. A entrega solicitada é uma única classe de teste: [UsuarioSenhaTest.java](src/test/java/br/edu/ifc/bikes/UsuarioSenhaTest.java).

O repositório inclui o projeto fornecido e as correções necessárias para executar os testes de ponta a ponta. A classe chama a API HTTP real, usa um banco H2 em memória e verifica tanto os códigos de resposta quanto a persistência da senha. Não utiliza mocks do serviço ou do repositório.

## Entrega da atividade

Envie apenas este arquivo:

```text
src/test/java/br/edu/ifc/bikes/UsuarioSenhaTest.java
```

Ele pertence ao pacote `br.edu.ifc.bikes` e contém todos os testes de alteração de senha. Para reutilizá-lo no projeto da disciplina, mantenha as dependências de teste, os scripts SQL e a implementação da alteração de senha compatíveis com o contrato abaixo. Os arquivos de produção incluídos aqui permitem executar a atividade neste repositório.

## Requisitos e execução

- JDK 25 ou superior; o projeto compila para Java 25.
- Acesso à internet na primeira execução para baixar as dependências.
- Maven Wrapper incluído: não é necessário instalar Maven.
- Os testes não dependem de MySQL nem de serviços externos.

Clone o repositório e entre na pasta:

```bash
git clone https://github.com/lcsrj/bikes-testes-alteracao-senha.git
cd bikes-testes-alteracao-senha
```

No Windows PowerShell, execute somente a classe da atividade:

```powershell
java -version
.\mvnw.cmd -B -ntp test "-Dtest=UsuarioSenhaTest"
```

No Linux ou macOS:

```bash
java -version
bash mvnw -B -ntp test -Dtest=UsuarioSenhaTest
```

Para compilar, executar todos os testes e gerar o JAR:

```powershell
.\mvnw.cmd -B -ntp clean verify
```

```bash
bash mvnw -B -ntp clean verify
```

O resultado esperado é `BUILD SUCCESS`: **24 testes** da classe de alteração de senha e **5 testes** existentes em `UsuarioIT`, totalizando **29**, sem falhas, erros ou testes ignorados. Os relatórios ficam em `target/surefire-reports/`; o pacote é `target/bikes-0.0.1-SNAPSHOT.jar`.

Se aparecer `release version 25 not supported`, configure `JAVA_HOME` para um JDK 25 ou superior antes de executar o Wrapper. No PowerShell, por exemplo, use `$env:JAVA_HOME = 'C:\caminho\do\jdk-25'` com o caminho da sua instalação.

## Contrato da alteração de senha

Endpoint: `PATCH /api/v1/usuarios/{id}` com `Content-Type: application/json`.

```json
{
  "senhaAtual": "123456",
  "novaSenha": "654321",
  "confirmaSenha": "654321"
}
```

Todos os campos são obrigatórios, não podem conter apenas espaços e devem ter exatamente seis caracteres, conforme a atividade. `senhaAtual` deve corresponder à senha armazenada e `novaSenha` deve ser igual a `confirmaSenha`.

| Situação | HTTP | Comportamento |
| --- | --- | --- |
| Dados válidos | 204 | Atualiza a senha e retorna corpo vazio |
| Senha atual incorreta | 400 | Mantém a senha armazenada |
| Nova senha e confirmação diferentes | 400 | Mantém a senha armazenada |
| Campo vazio, em branco, nulo, ausente ou com tamanho inválido | 422 | Rejeita a requisição antes da atualização |
| Usuário inexistente | 404 | Não cria nem altera usuários |

## Cenários cobertos na única classe

| Método | Casos | Verificação |
| --- | ---: | --- |
| `alterarSenha_DadosValidos_RetornaStatus204SemCorpo` | 1 | `isNoContent()`, corpo vazio, nova senha persistida e outro usuário preservado |
| `alterarSenha_SenhaAtualIncorreta_RetornaStatus400` | 1 | Senha atual incorreta e senha armazenada preservada |
| `alterarSenha_ConfirmacaoDiferente_RetornaStatus400` | 1 | Confirmação diferente e senha armazenada preservada |
| `alterarSenha_CampoInvalido_RetornaStatus422` | 18 | Seis valores inválidos para cada um dos três campos: vazio, espaços, cinco caracteres, sete caracteres, nulo e ausente |
| `alterarSenha_TodosOsCamposAusentes_RetornaStatus422` | 1 | Objeto JSON vazio e senha preservada |
| `alterarSenha_UsuarioInexistente_RetornaStatus404` | 1 | ID inexistente e ausência de alteração nos usuários existentes |
| `alterarSenha_SenhaAntigaAposAlteracao_RetornaStatus400` | 1 | Rejeita a senha antiga após uma alteração e aceita a nova senha como senha atual |

Cada execução recebe dados conhecidos por `@Sql` antes do teste e remove esses dados depois. Os usuários 100, 101 e 102 começam com a senha `123456`. O cliente HTTP usa a porta aleatória fornecida pelo Spring Boot, evitando depender da porta 8080.

O sucesso não desserializa um DTO de resposta: a alteração retorna 204 sem corpo. As verificações de persistência consultam o repositório para comprovar que a alteração ocorreu e que requisições rejeitadas não modificaram a senha.

## Alterações realizadas

- **`UsuarioSenhaTest.java`**: única classe criada para a entrega; inclui os quatro cenários exigidos e casos adicionais de regressão.
- **`UsuarioSenhaDTO.java`**: requisição com senha atual, nova senha e confirmação, validada com `@NotBlank` e `@Size`.
- **`PasswordInvalidException.java`**: exceção para senha atual incorreta ou confirmação diferente.
- **`UsuarioService.java`**: valida as senhas antes de persistir e executa a alteração em uma transação; usuário ausente gera 404.
- **`UsuarioController.java`**: recebe o novo DTO com `@Valid`, retorna 204 sem corpo e documenta 422 no OpenAPI.
- **`ApiExceptionHandler.java`**: traduz `PasswordInvalidException` para HTTP 400 no formato de erro existente.
- **`src/test/resources/application.properties`**: configura H2 em memória e criação/remoção de tabelas para os testes.
- **`pom.xml`**: alinha WebFlux e Validation à versão gerenciada pelo Spring Boot e inclui `UsuarioIT` na execução padrão do Surefire.
- **`.github/workflows/tests.yml`**: executa `clean verify` em pushes e pull requests com Java 25 e disponibiliza os relatórios como artefato.
- **`README.md`**: documenta entrega, execução, contrato, cobertura e alterações; o enunciado original está preservado abaixo.

O código conserva o modelo de armazenamento de senha do projeto acadêmico fornecido. A cobertura desta atividade trata de alteração e validação de senha; não inclui autenticação ou criptografia.

## Executar a aplicação

Os testes usam H2 automaticamente. A aplicação normal mantém a configuração MySQL do projeto: banco `bikes` em `localhost:3306`. Configure credenciais e URL por variáveis de ambiente, se necessário:

```powershell
$env:SPRING_DATASOURCE_URL = 'jdbc:mysql://localhost:3306/bikes'
$env:SPRING_DATASOURCE_USERNAME = 'seu_usuario'
$env:SPRING_DATASOURCE_PASSWORD = 'sua_senha'
.\mvnw.cmd spring-boot:run
```

Swagger UI: `http://localhost:8080/docs-bikes.html`. Documento OpenAPI: `http://localhost:8080/docs-bikes`.

## Material e enunciado originais

### Documentação com SpringDoc OpenAPI 3.1 e Swagger 3

- [Site oficial](https://springdoc.org/) - [Configuração](https://springdoc.org/#getting-started)

Dependência (`pom.xml`):
```
   <dependency>
      <groupId>org.springdoc</groupId>
      <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
      <version>3.1.1</version>
   </dependency>
```

`Application.properties`
```
   springdoc.swagger-ui.path=/docs-bikes.html
   # Código gerado para acessar a documentação da API no Swagger UI: http://localhost:8080/docs-bikes.html
   springdoc.api-docs.path=/docs-bikes
   springdoc.packages-to-scan=br.edu.ifc.bikes.web.controller
```

- Criar a classe [SpringDocOpenApiConfig](src/main/java/br/edu/ifc/bikes/config/SpringDocOpenApiConfig.java) no pacote `config`.

- Acessar a [documentação](http://localhost:8080/docs-bikes.html).

#### Acrescentando informações em Usuário

- Em [UsuarioController](src/main/java/br/edu/ifc//bikes/web/controller/UsuarioController.java):
   - No cabeçalho
   ```
   @Tag(name = "Usuarios", description = "Contém todas as operações relativas aos recursos para cadastro, edição e leitura de um usuário.")
   ```

   - Em `create()`
   ```
   @Operation(summary = "Criar um novo usuário", description = "Recurso para criar um novo usuário",
            responses = {
                @ApiResponse(responseCode = "201", description = "Recurso criado com sucesso",
                        content = @Content(mediaType = "application/json", schema = @Schema(implementation = UsuarioResponseDTO.class))),
                @ApiResponse(responseCode = "409", description = "Usuário e-mail já cadastrado no sistema",
                        content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorMessage.class))),
                @ApiResponse(responseCode = "422", description = "Recurso não processado por dados de entrada invalidos",
                        content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorMessage.class)))
            })
   ```

   - Em `getById()`
   ```
   @Operation(summary = "Recuperar um usuário pelo id", description = "Recuperar um usuário pelo id",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Recurso recuperado com sucesso",
                            content = @Content(mediaType = "application/json", schema = @Schema(implementation = UsuarioResponseDTO.class))),
                    @ApiResponse(responseCode = "404", description = "Recurso não encontrado",
                            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorMessage.class)))
            })
   ```

   - Em `updatePassword()`
   ```
   @Operation(summary = "Atualizar senha", description = "Atualizar senha",
            responses = {
                    @ApiResponse(responseCode = "204", description = "Senha atualizada com sucesso",
                            content = @Content(mediaType = "application/json", schema = @Schema(implementation = Void.class))),
                    @ApiResponse(responseCode = "400", description = "Senha não confere",
                            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorMessage.class))),
                    @ApiResponse(responseCode = "404", description = "Recurso não encontrado",
                            content = @Content(mediaType = "application/json", schema = @Schema(implementation = ErrorMessage.class)))
            })
   ```

   - Em `getAll()`
   ```
   @Operation(summary = "Listar todos os usuários", description = "Listar todos os usuários",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Lista com todos os usuários cadastrados",
                                    content = @Content(mediaType = "application/json",
                                    array = @ArraySchema(schema = @Schema(implementation = UsuarioResponseDto.class))))
            })
   ```
  
## Atividade 01 - Alterar Senha

  - Modificar a **alteração de senha** para que, além do campo `nova senha`, seja informado também a `confirmação de senha` e a `senha atual`.
  - Será necessário criar a classe `UsuarioSenhaDTO.java` para requisição.
    - Não esquecer de validar os campos.
  - Fazer o tratamento de exceção criando a classe `PasswordInvalidException` para validar a senha atual e comparar a nova senha com a confirmação.


## Atividade 02 - Teste de Alterar Senha

  - Desenvolver métodos de teste para as 04 possibilidades: sucesso, senha atual inválida, senha e confirmação não conferem e campos inválidos (vazios, senhas com menos e mais que 6 caracteres).
      - Observar (no Controller) que alteração de senha não retorna um corpo de mensagem, ou seja, o teste não terá retorno.
          - Como não tem retorno, os testes de valores não são necessários.
      - O método para o status será o `isNoContent()`.
