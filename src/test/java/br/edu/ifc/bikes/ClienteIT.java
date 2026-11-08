package br.edu.ifc.bikes;

import br.edu.ifc.bikes.dto.ClienteRequestDTO;
import br.edu.ifc.bikes.dto.ClienteResponseDTO;
import br.edu.ifc.bikes.dto.UsuarioRequestDTO;
import br.edu.ifc.bikes.dto.UsuarioResponseDTO;
import br.edu.ifc.bikes.entity.Usuario;
import br.edu.ifc.bikes.entity.Cliente;
import br.edu.ifc.bikes.repository.ClienteRepository;
import br.edu.ifc.bikes.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Sql(scripts = "/sql/usuarios/usuarios-insert.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@Sql(scripts = "/sql/usuarios/usuarios-delete.sql", executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)
class ClienteIT {

    private static final String CPF_MARIA = "52998224725";
    private static final String CPF_JOAO = "11144477735";

    @LocalServerPort
    private int port;

    @Autowired
    private ClienteRepository clienteRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private WebTestClient client;

    @BeforeEach
    void setUp() {
        client = WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
                .responseTimeout(Duration.ofSeconds(15)).build();
    }

    @Test
    void cadastrar_ComUsuarioAutenticado_VinculaUsuarioEAuditoria() {
        ClienteResponseDTO cliente = cadastrar("maria@gmail.com", CPF_MARIA);

        assertThat(cliente.id()).isPositive();
        assertThat(cliente.usuarioId()).isEqualTo(101L);
        assertThat(cliente.nome()).isEqualTo("Maria da Silva");
        assertThat(cliente.cpf()).isEqualTo(CPF_MARIA);
        assertThat(cliente.dataCriacao()).isNotNull();
        assertThat(cliente.dataModificacao()).isNotNull();
        assertThat(cliente.criadoPor()).isEqualTo("maria@gmail.com");
        assertThat(cliente.modificadoPor()).isEqualTo("maria@gmail.com");
        assertThat(clienteRepository.findByUsuarioId(101L)).isPresent();
    }

    @Test
    void cadastrar_ComUsuarioRecemCriado_AutenticaEVincula() {
        UsuarioResponseDTO usuario = client.post().uri("/api/v1/usuarios")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new UsuarioRequestDTO("novo@gmail.com", "123456"))
                .exchange().expectStatus().isCreated().expectBody(UsuarioResponseDTO.class)
                .returnResult().getResponseBody();

        assertThat(usuario).isNotNull();
        Usuario persistido = usuarioRepository.findById(usuario.id()).orElseThrow();
        assertThat(persistido.getPassword()).isNotEqualTo("123456");
        assertThat(passwordEncoder.matches("123456", persistido.getPassword())).isTrue();
        assertThat(persistido.getDataCriacao()).isNotNull();
        assertThat(persistido.getCriadoPor()).isEqualTo("sistema");
        assertThat(cadastrar("novo@gmail.com", CPF_MARIA).usuarioId()).isEqualTo(usuario.id());
    }

    @Test
    void cadastrar_UsuarioInformadoNoCorpo_NaoAlteraVinculo() {
        client.post().uri("/api/v1/clientes")
                .headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("nome", "Maria", "cpf", CPF_MARIA, "usuarioId", 102,
                        "usuario", Map.of("id", 102), "criadoPor", "admin", "id", 999))
                .exchange().expectStatus().isCreated()
                .expectBody().jsonPath("$.usuarioId").isEqualTo(101)
                .jsonPath("$.criadoPor").isEqualTo("maria@gmail.com");
    }

    @Test
    void cadastrar_SemAutenticacao_Retorna401ENaoPersiste() {
        client.post().uri("/api/v1/clientes").contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new ClienteRequestDTO("Maria", CPF_MARIA))
                .exchange().expectStatus().isUnauthorized()
                .expectHeader().exists("WWW-Authenticate")
                .expectBody().jsonPath("$.status").isEqualTo(401);
        assertThat(clienteRepository.count()).isZero();
    }

    @ParameterizedTest
    @MethodSource("credenciaisInvalidas")
    void cadastrar_CredenciaisInvalidas_Retorna401(String username, String password) {
        client.post().uri("/api/v1/clientes").headers(h -> h.setBasicAuth(username, password))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new ClienteRequestDTO("Maria", CPF_MARIA))
                .exchange().expectStatus().isUnauthorized().expectBody(Void.class);
        assertThat(clienteRepository.count()).isZero();
    }

    static Stream<Arguments> credenciaisInvalidas() {
        return Stream.of(Arguments.of("maria@gmail.com", "errada"),
                Arguments.of("inexistente@gmail.com", "123456"));
    }

    @ParameterizedTest
    @MethodSource("consultasProtegidas")
    void consultar_SemAutenticacao_Retorna401(String path) {
        client.get().uri(path).exchange().expectStatus().isUnauthorized().expectBody(Void.class);
    }

    static Stream<String> consultasProtegidas() {
        return Stream.of("/api/v1/clientes", "/api/v1/clientes/me", "/api/v1/clientes/1");
    }

    @Test
    void cadastrar_CpfDuplicado_Retorna409() {
        cadastrar("maria@gmail.com", CPF_MARIA);
        client.post().uri("/api/v1/clientes").headers(h -> h.setBasicAuth("joao@gmail.com", "123456"))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(new ClienteRequestDTO("João", CPF_MARIA))
                .exchange().expectStatus().isEqualTo(409)
                .expectBody().jsonPath("$.status").isEqualTo(409);
        assertThat(clienteRepository.count()).isEqualTo(1);
    }

    @Test
    void cadastrar_SegundoClienteDoMesmoUsuario_Retorna409() {
        cadastrar("maria@gmail.com", CPF_MARIA);
        client.post().uri("/api/v1/clientes").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(new ClienteRequestDTO("Maria", CPF_JOAO))
                .exchange().expectStatus().isEqualTo(409).expectBody(Void.class);
        assertThat(clienteRepository.count()).isEqualTo(1);
    }

    @Test
    void banco_GaranteCpfUnicoUsuarioUnicoEVinculoObrigatorio() {
        cadastrar("maria@gmail.com", CPF_MARIA);

        Cliente cpfDuplicado = novoCliente(CPF_MARIA, usuarioRepository.findById(102L).orElseThrow());
        assertThatThrownBy(() -> clienteRepository.saveAndFlush(cpfDuplicado))
                .isInstanceOf(DataIntegrityViolationException.class);

        Cliente usuarioDuplicado = novoCliente(CPF_JOAO, usuarioRepository.findById(101L).orElseThrow());
        assertThatThrownBy(() -> clienteRepository.saveAndFlush(usuarioDuplicado))
                .isInstanceOf(DataIntegrityViolationException.class);

        Cliente semUsuario = novoCliente(CPF_JOAO, null);
        assertThatThrownBy(() -> clienteRepository.saveAndFlush(semUsuario))
                .isInstanceOf(DataIntegrityViolationException.class);

        Cliente usuarioInexistente = novoCliente(CPF_JOAO, usuarioRepository.getReferenceById(99999L));
        assertThatThrownBy(() -> clienteRepository.saveAndFlush(usuarioInexistente))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(clienteRepository.count()).isEqualTo(1);
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("camposInvalidos")
    void cadastrar_CampoInvalido_Retorna422(String campo, String cenario, Object valor, boolean omitir) {
        Map<String, Object> body = new HashMap<>(Map.of("nome", "Maria", "cpf", CPF_MARIA));
        if (omitir) body.remove(campo);
        else body.put(campo, valor);

        client.post().uri("/api/v1/clientes").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(body)
                .exchange().expectStatus().isEqualTo(422)
                .expectBody().jsonPath("$.errors." + campo).exists();
        assertThat(clienteRepository.count()).isZero();
    }

    static Stream<Arguments> camposInvalidos() {
        return Stream.of(
                Arguments.of("nome", "vazio", "", false),
                Arguments.of("nome", "espaços", "   ", false),
                Arguments.of("nome", "curto", "A", false),
                Arguments.of("nome", "longo", "a".repeat(101), false),
                Arguments.of("nome", "nulo", null, false),
                Arguments.of("nome", "ausente", null, true),
                Arguments.of("cpf", "vazio", "", false),
                Arguments.of("cpf", "espaços", "           ", false),
                Arguments.of("cpf", "curto", "1234567890", false),
                Arguments.of("cpf", "longo", "123456789012", false),
                Arguments.of("cpf", "letras", "abcdefghijk", false),
                Arguments.of("cpf", "dígitos verificadores", "52998224724", false),
                Arguments.of("cpf", "dígitos repetidos", "11111111111", false),
                Arguments.of("cpf", "pontuação", "529.982.247-25", false),
                Arguments.of("cpf", "nulo", null, false),
                Arguments.of("cpf", "ausente", null, true));
    }

    @Test
    void consultar_ProprioCliente_Retorna200() {
        ClienteResponseDTO cliente = cadastrar("maria@gmail.com", CPF_MARIA);
        for (String path : List.of("/api/v1/clientes/me", "/api/v1/clientes/" + cliente.id())) {
            client.get().uri(path).headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                    .exchange().expectStatus().isOk().expectBody(ClienteResponseDTO.class).isEqualTo(cliente);
        }
    }

    @Test
    void consultar_ClienteDeOutroUsuario_Retorna403() {
        ClienteResponseDTO cliente = cadastrar("maria@gmail.com", CPF_MARIA);
        client.get().uri("/api/v1/clientes/{id}", cliente.id())
                .headers(h -> h.setBasicAuth("joao@gmail.com", "123456"))
                .exchange().expectStatus().isForbidden()
                .expectBody().jsonPath("$.status").isEqualTo(403)
                .jsonPath("$.cpf").doesNotExist();
    }

    @Test
    void listar_ClienteComum_Retorna403() {
        cadastrar("maria@gmail.com", CPF_MARIA);
        client.get().uri("/api/v1/clientes").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
    }

    @Test
    void consultar_Admin_RetornaQualquerClienteETodosOsClientes() {
        ClienteResponseDTO maria = cadastrar("maria@gmail.com", CPF_MARIA);
        ClienteResponseDTO joao = cadastrar("joao@gmail.com", CPF_JOAO);

        client.get().uri("/api/v1/clientes/{id}", maria.id())
                .headers(h -> h.setBasicAuth("jose@gmail.com", "123456"))
                .exchange().expectStatus().isOk().expectBody(ClienteResponseDTO.class).isEqualTo(maria);
        client.get().uri("/api/v1/clientes").headers(h -> h.setBasicAuth("jose@gmail.com", "123456"))
                .exchange().expectStatus().isOk().expectBodyList(ClienteResponseDTO.class)
                .hasSize(2).contains(maria, joao);
    }

    @Test
    void consultar_SemClienteOuIdInexistente_Retorna404() {
        client.get().uri("/api/v1/clientes/me").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .exchange().expectStatus().isNotFound().expectBody(Void.class);
        client.get().uri("/api/v1/clientes/99999").headers(h -> h.setBasicAuth("jose@gmail.com", "123456"))
                .exchange().expectStatus().isNotFound().expectBody(Void.class);
    }

    @Test
    void usuario_NaoPodeConsultarOuAlterarSenhaDeOutro() {
        client.get().uri("/api/v1/usuarios/102").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
        client.get().uri("/api/v1/usuarios").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
        client.patch().uri("/api/v1/usuarios/102").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("senhaAtual", "123456", "novaSenha", "654321", "confirmaSenha", "654321"))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
        assertThat(passwordEncoder.matches("123456", usuarioRepository.findById(102L).orElseThrow().getPassword())).isTrue();
    }

    @Test
    void alterarSenha_SemAutenticacao_Retorna401() {
        client.patch().uri("/api/v1/usuarios/101").contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("senhaAtual", "123456", "novaSenha", "654321", "confirmaSenha", "654321"))
                .exchange().expectStatus().isUnauthorized().expectBody(Void.class);
    }

    @Test
    void alterarSenha_AtualizaAutenticacaoEAuditoria() {
        client.patch().uri("/api/v1/usuarios/101").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("senhaAtual", "123456", "novaSenha", "654321", "confirmaSenha", "654321"))
                .exchange().expectStatus().isNoContent().expectBody().isEmpty();

        Usuario usuario = usuarioRepository.findById(101L).orElseThrow();
        assertThat(usuario.getDataModificacao()).isNotNull();
        assertThat(usuario.getModificadoPor()).isEqualTo("maria@gmail.com");
        client.get().uri("/api/v1/clientes/me").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .exchange().expectStatus().isUnauthorized().expectBody(Void.class);
        client.get().uri("/api/v1/clientes/me").headers(h -> h.setBasicAuth("maria@gmail.com", "654321"))
                .exchange().expectStatus().isNotFound().expectBody(Void.class);
    }

    @Test
    void documentacao_Publica_DeclaraOpenApi31EAutenticacao() {
        client.get().uri("/docs-bikes").exchange().expectStatus().isOk()
                .expectBody().jsonPath("$.openapi").value(value -> assertThat(value.toString()).startsWith("3.1."))
                .jsonPath("$.components.securitySchemes.basicAuth.type").isEqualTo("http")
                .jsonPath("$.components.securitySchemes.basicAuth.scheme").isEqualTo("basic")
                .jsonPath("$.paths['/api/v1/clientes'].post.security[0].basicAuth").isArray()
                .jsonPath("$.paths['/api/v1/clientes'].post.responses['401']").exists()
                .jsonPath("$.paths['/api/v1/clientes/me']").exists()
                .jsonPath("$.paths['/api/v1/clientes/{id}'].get.responses['403']").exists();
        client.get().uri("/swagger-ui/index.html").exchange().expectStatus().isOk().expectBody(Void.class);
    }

    private ClienteResponseDTO cadastrar(String username, String cpf) {
        ClienteResponseDTO response = client.post().uri("/api/v1/clientes")
                .headers(h -> h.setBasicAuth(username, "123456"))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new ClienteRequestDTO("  Maria da Silva  ", cpf))
                .exchange().expectStatus().isCreated().expectHeader().exists("Location")
                .expectBody(ClienteResponseDTO.class).returnResult().getResponseBody();
        assertThat(response).isNotNull();
        return response;
    }

    private static Cliente novoCliente(String cpf, Usuario usuario) {
        Cliente cliente = new Cliente();
        cliente.setNome("Cliente");
        cliente.setCpf(cpf);
        cliente.setUsuario(usuario);
        return cliente;
    }
}
