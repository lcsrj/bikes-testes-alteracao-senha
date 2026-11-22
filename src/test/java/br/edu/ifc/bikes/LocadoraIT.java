package br.edu.ifc.bikes;

import br.edu.ifc.bikes.dto.*;
import br.edu.ifc.bikes.entity.*;
import br.edu.ifc.bikes.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.test.web.reactive.server.EntityExchangeResult;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.net.Authenticator;
import java.net.PasswordAuthentication;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.*;
import static org.awaitility.Awaitility.await;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:bikes-locadora-test;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000")
@Import(LocadoraIT.TempoConfig.class)
@Sql(scripts = "/sql/usuarios/usuarios-insert.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@Sql(scripts = "/sql/usuarios/usuarios-delete.sql", executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)
class LocadoraIT {
    private static final String ADMIN = "jose@gmail.com";
    private static final String MARIA = "maria@gmail.com";
    private static final String JOAO = "joao@gmail.com";

    @LocalServerPort int port;
    @Autowired RelogioTeste clock;
    @Autowired BicicletaRepository bicicletas;
    @Autowired LocacaoRepository locacoes;
    @Autowired ClienteRepository clientes;
    @Autowired UsuarioRepository usuarios;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    WebTestClient client;
    Map<String, String> tokens = new ConcurrentHashMap<>();

    @BeforeEach
    void setup() {
        clock.reset();
        tokens.clear();
        client = WebTestClient.bindToServer().baseUrl("http://localhost:" + port)
                .responseTimeout(Duration.ofSeconds(20)).build();
    }

    @Test
    void login_EmiteJwtEPermiteAcessoProtegido() {
        String token = token(ADMIN);
        assertThat(token.split("\\.")).hasSize(3);
        client.get().uri("/api/v1/bicicletas").headers(h -> h.setBearerAuth(token))
                .exchange().expectStatus().isOk().expectBodyList(BicicletaResponseDTO.class).hasSize(0);
    }

    @Test
    void basic_AnunciaBasicEBearerNoDesafio() {
        client.get().uri("/api/v1/bicicletas").exchange().expectStatus().isUnauthorized()
                .expectHeader().valueEquals("WWW-Authenticate", "Basic realm=\"Bikes API\"", "Bearer realm=\"Bikes API\"")
                .expectBody(Void.class);
    }

    @Test
    void basic_AutenticaQuandoClienteAguardaDesafio() throws Exception {
        try (HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10))
                .authenticator(new Authenticator() {
                    @Override
                    protected PasswordAuthentication getPasswordAuthentication() {
                        return new PasswordAuthentication(ADMIN, "123456".toCharArray());
                    }
                }).build()) {
            HttpResponse<String> response = http.send(HttpRequest.newBuilder(
                            URI.create("http://localhost:" + port + "/api/v1/bicicletas"))
                    .timeout(Duration.ofSeconds(15)).GET().build(), HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.body()).isEqualTo("[]");
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void locacao_EsperaBloqueioSemCobrarTempoDeEspera(boolean codigoExplicito) throws Exception {
        cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        Map<String, Object> body = pedido(codigoExplicito ? "BIKE-001" : null);
        EntityExchangeResult<byte[]> response = alugarAposEspera(body, Duration.ofMinutes(10));
        assertThat(response.getStatus().value()).isEqualTo(201);
        LocacaoResponseDTO locacao = json.readValue(response.getResponseBody(), LocacaoResponseDTO.class);
        assertThat(locacao.dataRetirada()).isEqualTo(LocalDateTime.now(clock));
        assertThat(locacoes.findById(locacao.id()).orElseThrow().getDataRetirada()).isEqualTo(LocalDateTime.now(clock));

        avancar(Duration.ofMinutes(30));
        devolver(MARIA, locacao.id(), false).expectStatus().isOk().expectBody()
                .jsonPath("$.duracaoSegundos").isEqualTo(1800)
                .jsonPath("$.valor").isEqualTo(5.0);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void locacao_EsperaBloqueioRevalidaDevolucaoPrevista(boolean codigoExplicito) throws Exception {
        cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        Map<String, Object> body = pedido(codigoExplicito ? "BIKE-001" : null);
        body.put("dataDevolucaoPrevista", LocalDateTime.now(clock).plusMinutes(5).toString());
        EntityExchangeResult<byte[]> response = alugarAposEspera(body, Duration.ofMinutes(10));
        assertThat(response.getStatus().value()).isEqualTo(422);
        assertThat(locacoes.count()).isZero();
        assertThat(bicicletas.findByCodigo("BIKE-001").orElseThrow().getStatus()).isEqualTo(Bicicleta.Status.LIVRE);
    }

    @Test
    void locacao_EsperaBloqueioRevalidaValidadeDoCartao() throws Exception {
        avancar(Duration.ofDays(30).plusHours(11).plusMinutes(55));
        cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        Map<String, Object> body = pedido("BIKE-001");
        Map<String, Object> cartao = new HashMap<>(cartao());
        cartao.put("mesValidade", 1);
        cartao.put("anoValidade", 2030);
        body.put("cartao", cartao);
        EntityExchangeResult<byte[]> response = alugarAposEspera(body, Duration.ofMinutes(10));
        assertThat(response.getStatus().value()).isEqualTo(422);
        assertThat(locacoes.count()).isZero();
        assertThat(bicicletas.findByCodigo("BIKE-001").orElseThrow().getStatus()).isEqualTo(Bicicleta.Status.LIVRE);
    }

    @Test
    void login_RejeitaSenhaErradaEEntradaInvalida() {
        client.post().uri("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .bodyValue(new LoginRequestDTO(ADMIN, "000000")).exchange()
                .expectStatus().isUnauthorized().expectBody().jsonPath("$.status").isEqualTo(401);
        client.post().uri("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("username", "invalido", "password", "1")).exchange()
                .expectStatus().isEqualTo(422).expectBody(Void.class);
    }

    @Test
    void jwt_RejeitaTokenInvalidoExpiradoEUsuarioExcluido() {
        client.get().uri("/api/v1/bicicletas").headers(h -> h.setBearerAuth("invalido"))
                .exchange().expectStatus().isUnauthorized().expectBody(Void.class);
        String tokenAdmin = token(ADMIN);
        clock.advance(Duration.ofHours(2));
        client.get().uri("/api/v1/bicicletas").headers(h -> h.setBearerAuth(tokenAdmin))
                .exchange().expectStatus().isUnauthorized().expectBody(Void.class);
        tokens.clear();
        String tokenJoao = token(JOAO);
        usuarios.deleteById(102L);
        client.get().uri("/api/v1/clientes/me").headers(h -> h.setBearerAuth(tokenJoao))
                .exchange().expectStatus().isUnauthorized().expectBody(Void.class);
    }

    @Test
    void jwt_ConsultaPerfilAtualNoBanco() {
        String token = token(ADMIN);
        Usuario usuario = usuarios.findById(100L).orElseThrow();
        usuario.setRole(Usuario.Role.CLIENTE);
        usuarios.saveAndFlush(usuario);
        client.get().uri("/api/v1/bicicletas").headers(h -> h.setBearerAuth(token))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
    }

    @ParameterizedTest
    @MethodSource("rotasProtegidas")
    void recursos_SemAutenticacao_Retornam401(String metodo, String rota) {
        client.method(org.springframework.http.HttpMethod.valueOf(metodo)).uri(rota)
                .contentType(MediaType.APPLICATION_JSON).bodyValue(Map.of())
                .exchange().expectStatus().isUnauthorized().expectBody(Void.class);
    }

    static Stream<Arguments> rotasProtegidas() {
        return Stream.of(Arguments.of("POST", "/api/v1/bicicletas"), Arguments.of("GET", "/api/v1/bicicletas"),
                Arguments.of("GET", "/api/v1/bicicletas/BIKE-001"), Arguments.of("PATCH", "/api/v1/bicicletas/BIKE-001/status"),
                Arguments.of("POST", "/api/v1/locacoes"), Arguments.of("GET", "/api/v1/locacoes/me"),
                Arguments.of("GET", "/api/v1/locacoes/1"), Arguments.of("POST", "/api/v1/locacoes/1/devolucao"),
                Arguments.of("GET", "/api/v1/relatorios/locacoes"));
    }

    @Test
    void cliente_PermissoesDoEnunciado() {
        ClienteResponseDTO maria = cadastrarCliente(MARIA);
        client.get().uri("/api/v1/clientes/me").headers(h -> h.setBearerAuth(token(MARIA)))
                .exchange().expectStatus().isOk().expectBody().jsonPath("$.id").isEqualTo(maria.id().intValue());
        client.get().uri("/api/v1/clientes/{id}", maria.id()).headers(h -> h.setBearerAuth(token(MARIA)))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
        client.get().uri("/api/v1/clientes/{id}", maria.id()).headers(h -> h.setBearerAuth(token(ADMIN)))
                .exchange().expectStatus().isOk().expectBody(ClienteResponseDTO.class).isEqualTo(maria);
        client.post().uri("/api/v1/clientes").headers(h -> h.setBearerAuth(token(ADMIN)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(Map.of("nome", "Admin", "cpf", "52998224725"))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
    }

    @Test
    void cliente_PermiteContatosOpcionaisDoModeloDeDados() {
        client.post().uri("/api/v1/clientes").headers(h -> h.setBearerAuth(token(MARIA)))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("nome", "Maria da Silva", "cpf", "52998224725",
                        "telefone", "(49) 99999-9999", "email", "contato@example.com"))
                .exchange().expectStatus().isCreated().expectBody()
                .jsonPath("$.telefone").isEqualTo("(49) 99999-9999")
                .jsonPath("$.email").isEqualTo("contato@example.com");
        Cliente cliente = clientes.findByUsuarioId(101L).orElseThrow();
        assertThat(cliente.getTelefone()).isEqualTo("(49) 99999-9999");
        assertThat(cliente.getEmail()).isEqualTo("contato@example.com");
    }

    @ParameterizedTest
    @ValueSource(strings = {"telefone", "email"})
    void cliente_ValidaContatosQuandoInformados(String campo) {
        client.post().uri("/api/v1/clientes").headers(h -> h.setBearerAuth(token(MARIA)))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("nome", "Maria da Silva", "cpf", "52998224725", campo, "invalido"))
                .exchange().expectStatus().isEqualTo(422).expectBody(Void.class);
        assertThat(clientes.count()).isZero();
    }

    @Test
    void bicicleta_CadastroConsultaPorCodigoEAuditoria() {
        BicicletaResponseDTO bicicleta = cadastrarBicicleta("bike-001");
        assertThat(bicicleta.codigo()).isEqualTo("BIKE-001");
        assertThat(bicicleta.codigo()).isNotEqualTo(bicicleta.id().toString());
        assertThat(bicicleta.status()).isEqualTo(Bicicleta.Status.LIVRE);
        assertThat(bicicleta.criadoPor()).isEqualTo(ADMIN);
        assertThat(bicicleta.dataCriacao()).isEqualTo(LocalDateTime.now(clock));
        client.get().uri("/api/v1/bicicletas/bike-001").headers(h -> h.setBearerAuth(token(ADMIN)))
                .exchange().expectStatus().isOk().expectBody(BicicletaResponseDTO.class).isEqualTo(bicicleta);
        client.get().uri("/api/v1/bicicletas").headers(h -> h.setBearerAuth(token(ADMIN)))
                .exchange().expectStatus().isOk().expectBodyList(BicicletaResponseDTO.class).contains(bicicleta);
        client.get().uri("/api/v1/bicicletas/INEXISTENTE").headers(h -> h.setBearerAuth(token(ADMIN)))
                .exchange().expectStatus().isNotFound().expectBody(Void.class);
    }

    @Test
    void bicicleta_ClienteNaoPodeExecutarOperacoesAdministrativas() {
        for (String rota : List.of("/api/v1/bicicletas", "/api/v1/bicicletas/BIKE-001", "/api/v1/relatorios/locacoes")) {
            client.get().uri(rota).headers(h -> h.setBearerAuth(token(MARIA)))
                    .exchange().expectStatus().isForbidden().expectBody(Void.class);
        }
        client.post().uri("/api/v1/bicicletas").headers(h -> h.setBearerAuth(token(MARIA)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(Map.of("codigo", "BIKE-001", "modelo", "Urbana"))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
        client.patch().uri("/api/v1/bicicletas/BIKE-001/status").headers(h -> h.setBearerAuth(token(MARIA)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(Map.of("status", "MANUTENCAO"))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
        assertThat(bicicletas.count()).isZero();
    }

    @Test
    void bicicleta_RejeitaCodigoDuplicadoEValidaCampos() {
        cadastrarBicicleta("BIKE-001");
        client.post().uri("/api/v1/bicicletas").headers(h -> h.setBearerAuth(token(ADMIN)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(Map.of("codigo", "bike-001", "modelo", "Urbana"))
                .exchange().expectStatus().isEqualTo(409).expectBody(Void.class);
        client.post().uri("/api/v1/bicicletas").headers(h -> h.setBearerAuth(token(ADMIN)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(Map.of("codigo", "1", "modelo", " "))
                .exchange().expectStatus().isEqualTo(422).expectBody(Void.class);
        Bicicleta duplicada = new Bicicleta();
        duplicada.setCodigo("BIKE-001");
        duplicada.setModelo("Urbana");
        assertThatThrownBy(() -> bicicletas.saveAndFlush(duplicada)).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(bicicletas.count()).isEqualTo(1);
    }

    @Test
    void bicicleta_ManutencaoELiberacao() {
        cadastrarBicicleta("BIKE-001");
        alterarStatus("BIKE-001", "MANUTENCAO").expectStatus().isOk()
                .expectBody().jsonPath("$.status").isEqualTo("MANUTENCAO");
        cadastrarCliente(MARIA);
        alugar(MARIA, "BIKE-001").expectStatus().isEqualTo(409).expectBody(Void.class);
        alterarStatus("BIKE-001", "LIVRE").expectStatus().isOk().expectBody(Void.class);
        alterarStatus("BIKE-001", "OCUPADA").expectStatus().isEqualTo(409).expectBody(Void.class);
        alterarStatus("BIKE-001", "INVALIDO").expectStatus().isBadRequest().expectBody(Void.class);
        alterarStatus("BIKE-001", null).expectStatus().isEqualTo(422).expectBody(Void.class);
        assertThat(bicicletas.findByCodigo("BIKE-001").orElseThrow().getStatus()).isEqualTo(Bicicleta.Status.LIVRE);
    }

    @Test
    void locacao_CicloCompletoComCalculoRelatorioENovaLocacao() {
        ClienteResponseDTO maria = cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        LocacaoResponseDTO locacao = criarLocacao(MARIA, null);
        assertThat(locacao.clienteId()).isEqualTo(maria.id());
        assertThat(locacao.codigoBicicleta()).isEqualTo("BIKE-001");
        assertThat(locacao.status()).isEqualTo(Locacao.Status.ATIVA);
        assertThat(locacao.dataRetirada()).isEqualTo(LocalDateTime.now(clock));
        assertThat(locacao.dataDevolucao()).isNull();
        assertThat(locacao.valor()).isNull();
        assertThat(locacao.cartaoFinal()).isEqualTo("1111");
        assertThat(bicicletas.findByCodigo("BIKE-001").orElseThrow().getStatus()).isEqualTo(Bicicleta.Status.OCUPADA);
        assertThat(locacoes.findById(locacao.id()).orElseThrow().getCriadoPor()).isEqualTo(MARIA);

        avancar(Duration.ofMinutes(30));
        LocacaoResponseDTO devolvida = devolver(MARIA, locacao.id(), false).expectStatus().isOk()
                .expectBody(LocacaoResponseDTO.class).returnResult().getResponseBody();
        assertThat(devolvida).isNotNull();
        assertThat(devolvida.duracaoSegundos()).isEqualTo(1800);
        assertThat(devolvida.valor()).isEqualByComparingTo("5.00");
        assertThat(devolvida.status()).isEqualTo(Locacao.Status.FINALIZADA);
        assertThat(devolvida.dataDevolucao()).isEqualTo(LocalDateTime.now(clock));
        assertThat(bicicletas.findByCodigo("BIKE-001").orElseThrow().getStatus()).isEqualTo(Bicicleta.Status.LIVRE);
        assertThat(locacoes.findById(locacao.id()).orElseThrow().getModificadoPor()).isEqualTo(MARIA);
        client.get().uri("/api/v1/locacoes/me").headers(h -> h.setBearerAuth(token(MARIA)))
                .exchange().expectStatus().isOk().expectBodyList(LocacaoResponseDTO.class).contains(devolvida);
        client.get().uri("/api/v1/relatorios/locacoes").headers(h -> h.setBearerAuth(token(ADMIN)))
                .exchange().expectStatus().isOk().expectBody()
                .jsonPath("$[0].nomeCliente").isEqualTo("Maria da Silva")
                .jsonPath("$[0].codigoBicicleta").isEqualTo("BIKE-001")
                .jsonPath("$[0].duracaoSegundos").isEqualTo(1800)
                .jsonPath("$[0].status").isEqualTo("FINALIZADA");
        assertThat(criarLocacao(MARIA, "BIKE-001").id()).isNotEqualTo(locacao.id());
    }

    @Test
    void locacao_SemClienteSemDisponibilidadeEPerfilAdmin() {
        cadastrarBicicleta("BIKE-001");
        alugar(MARIA, null).expectStatus().isEqualTo(409).expectBody(Void.class);
        alugar(ADMIN, null).expectStatus().isForbidden().expectBody(Void.class);
        cadastrarCliente(MARIA);
        alugar(MARIA, "INEXISTENTE").expectStatus().isNotFound().expectBody(Void.class);
        alterarStatus("BIKE-001", "MANUTENCAO").expectStatus().isOk().expectBody(Void.class);
        alugar(MARIA, null).expectStatus().isEqualTo(409).expectBody(Void.class);
        assertThat(locacoes.count()).isZero();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("dadosLocacaoInvalidos")
    void locacao_ValidaCartaoEDevolucaoPrevistaSemReservar(String campo, Object valor) {
        cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        Map<String, Object> body = pedido(null);
        if (campo.startsWith("cartao.")) {
            Map<String, Object> cartao = new HashMap<>(cartao());
            cartao.put(campo.substring(7), valor);
            body.put("cartao", cartao);
        } else body.put(campo, valor);
        client.post().uri("/api/v1/locacoes").headers(h -> h.setBearerAuth(token(MARIA)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(body).exchange()
                .expectStatus().isEqualTo(422).expectBody(Void.class);
        assertThat(locacoes.count()).isZero();
        assertThat(bicicletas.findByCodigo("BIKE-001").orElseThrow().getStatus()).isEqualTo(Bicicleta.Status.LIVRE);
    }

    static Stream<Arguments> dadosLocacaoInvalidos() {
        return Stream.of(Arguments.of("cartao", null), Arguments.of("cartao.numero", "4111111111111112"),
                Arguments.of("cartao.numero", ""), Arguments.of("cartao.numero", null),
                Arguments.of("cartao.cvv", "12"), Arguments.of("cartao.cvv", "abc"),
                Arguments.of("cartao.titular", ""), Arguments.of("cartao.mesValidade", 13),
                Arguments.of("cartao.anoValidade", 2020), Arguments.of("dataDevolucaoPrevista", null),
                Arguments.of("dataDevolucaoPrevista", "2029-12-01T12:00:00"),
                Arguments.of("dataDevolucaoPrevista", "2030-01-01T12:00:00"),
                Arguments.of("codigoBicicleta", "!"));
    }

    @Test
    void locacao_NaoExpoeNemArmazenaNumeroCompletoOuCvv() {
        cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        alugar(MARIA, null).expectStatus().isCreated().expectBody()
                .jsonPath("$.cartaoFinal").isEqualTo("1111")
                .jsonPath("$.cartao").doesNotExist().jsonPath("$.numero").doesNotExist().jsonPath("$.cvv").doesNotExist();
        assertThat(jdbc.queryForList("select * from locacoes").toString()).doesNotContain("4111111111111111");
        assertThat(jdbc.queryForList("select column_name from information_schema.columns where table_name = 'LOCACOES'", String.class))
                .doesNotContain("CVV", "NUMERO", "NUMERO_CARTAO");
    }

    @Test
    void locacao_NaoPermiteAlterarBicicletaOcupadaOuAlugarNovamente() {
        cadastrarCliente(MARIA);
        cadastrarCliente(JOAO);
        cadastrarBicicleta("BIKE-001");
        criarLocacao(MARIA, "BIKE-001");
        alugar(JOAO, "BIKE-001").expectStatus().isEqualTo(409).expectBody(Void.class);
        alterarStatus("BIKE-001", "LIVRE").expectStatus().isEqualTo(409).expectBody(Void.class);
        alterarStatus("BIKE-001", "MANUTENCAO").expectStatus().isEqualTo(409).expectBody(Void.class);
        assertThat(locacoes.count()).isEqualTo(1);
    }

    @Test
    void locacao_OutroClienteNaoPodeConsultarOuDevolver() {
        cadastrarCliente(MARIA);
        cadastrarCliente(JOAO);
        cadastrarBicicleta("BIKE-001");
        LocacaoResponseDTO locacao = criarLocacao(MARIA, null);
        client.get().uri("/api/v1/locacoes/{id}", locacao.id()).headers(h -> h.setBearerAuth(token(JOAO)))
                .exchange().expectStatus().isForbidden().expectBody(Void.class);
        devolver(JOAO, locacao.id(), false).expectStatus().isForbidden().expectBody(Void.class);
        client.get().uri("/api/v1/locacoes/me").headers(h -> h.setBearerAuth(token(JOAO)))
                .exchange().expectStatus().isOk().expectBodyList(LocacaoResponseDTO.class).hasSize(0);
        assertThat(locacoes.findById(locacao.id()).orElseThrow().getStatus()).isEqualTo(Locacao.Status.ATIVA);
    }

    @Test
    void devolucao_AdminPodeRegistrarProblemaEEncaminharManutencao() {
        cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        LocacaoResponseDTO locacao = criarLocacao(MARIA, null);
        avancar(Duration.ofHours(2));
        devolver(ADMIN, locacao.id(), true).expectStatus().isOk().expectBody()
                .jsonPath("$.valor").isEqualTo(20.0).jsonPath("$.duracaoSegundos").isEqualTo(7200);
        assertThat(bicicletas.findByCodigo("BIKE-001").orElseThrow().getStatus()).isEqualTo(Bicicleta.Status.MANUTENCAO);
        alugar(MARIA, null).expectStatus().isEqualTo(409).expectBody(Void.class);
        alterarStatus("BIKE-001", "LIVRE").expectStatus().isOk().expectBody(Void.class);
    }

    @Test
    void devolucao_CobrancaMinimaENaoRepeteFinalizacao() {
        cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        LocacaoResponseDTO locacao = criarLocacao(MARIA, null);
        devolver(MARIA, locacao.id(), false).expectStatus().isOk().expectBody()
                .jsonPath("$.valor").isEqualTo(0.17).jsonPath("$.duracaoSegundos").isEqualTo(0);
        avancar(Duration.ofHours(1));
        devolver(MARIA, locacao.id(), true).expectStatus().isEqualTo(409).expectBody(Void.class);
        assertThat(locacoes.findById(locacao.id()).orElseThrow().getValor()).isEqualByComparingTo("0.17");
        assertThat(bicicletas.findByCodigo("BIKE-001").orElseThrow().getStatus()).isEqualTo(Bicicleta.Status.LIVRE);
        devolver(ADMIN, 99999L, false).expectStatus().isNotFound().expectBody(Void.class);
    }

    @Test
    void relatorio_ListaAtivasEFinalizadasComFiltroEPermissao() {
        cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        cadastrarBicicleta("BIKE-002");
        LocacaoResponseDTO finalizada = criarLocacao(MARIA, "BIKE-001");
        criarLocacao(MARIA, "BIKE-002");
        avancar(Duration.ofSeconds(120));
        devolver(MARIA, finalizada.id(), false).expectStatus().isOk().expectBody(Void.class);
        client.get().uri("/api/v1/relatorios/locacoes").headers(h -> h.setBearerAuth(token(ADMIN)))
                .exchange().expectStatus().isOk().expectBodyList(RelatorioLocacaoDTO.class).hasSize(2);
        client.get().uri("/api/v1/relatorios/locacoes?status=ATIVA").headers(h -> h.setBearerAuth(token(ADMIN)))
                .exchange().expectStatus().isOk().expectBody().jsonPath("$.length()").isEqualTo(1)
                .jsonPath("$[0].codigoBicicleta").isEqualTo("BIKE-002")
                .jsonPath("$[0].duracaoSegundos").isEqualTo(120)
                .jsonPath("$[0].dataDevolucao").isEmpty().jsonPath("$[0].valor").isEmpty();
        client.get().uri("/api/v1/relatorios/locacoes?status=FINALIZADA").headers(h -> h.setBearerAuth(token(ADMIN)))
                .exchange().expectStatus().isOk().expectBody().jsonPath("$.length()").isEqualTo(1);
        client.get().uri("/api/v1/relatorios/locacoes?status=INVALIDO").headers(h -> h.setBearerAuth(token(ADMIN)))
                .exchange().expectStatus().isBadRequest().expectBody(Void.class);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void concorrencia_DuasSolicitacoesNaoReservamAMesmaBicicleta(boolean codigoExplicito) throws Exception {
        cadastrarCliente(MARIA);
        cadastrarCliente(JOAO);
        cadastrarBicicleta("BIKE-001");
        token(MARIA);
        token(JOAO);
        String codigo = codigoExplicito ? "BIKE-001" : null;
        List<Integer> status = simultaneo(() -> alugar(MARIA, codigo).expectBody().returnResult().getStatus().value(),
                () -> alugar(JOAO, codigo).expectBody().returnResult().getStatus().value());
        assertThat(status).containsExactlyInAnyOrder(201, 409);
        assertThat(locacoes.count()).isEqualTo(1);
        assertThat(bicicletas.findByCodigo("BIKE-001").orElseThrow().getStatus()).isEqualTo(Bicicleta.Status.OCUPADA);
    }

    @Test
    void concorrencia_DuasDevolucoesFinalizamUmaUnicaVez() throws Exception {
        cadastrarCliente(MARIA);
        cadastrarBicicleta("BIKE-001");
        LocacaoResponseDTO locacao = criarLocacao(MARIA, null);
        avancar(Duration.ofMinutes(30));
        token(MARIA);
        List<Integer> status = simultaneo(() -> devolver(MARIA, locacao.id(), false).expectBody().returnResult().getStatus().value(),
                () -> devolver(MARIA, locacao.id(), false).expectBody().returnResult().getStatus().value());
        assertThat(status).containsExactlyInAnyOrder(200, 409);
        assertThat(locacoes.findById(locacao.id()).orElseThrow().getValor()).isEqualByComparingTo("5.00");
    }

    @Test
    void banco_ImpedeDuasLocacoesAtivasDaMesmaBicicleta() {
        ClienteResponseDTO cliente = cadastrarCliente(MARIA);
        BicicletaResponseDTO bicicleta = cadastrarBicicleta("BIKE-001");
        criarLocacao(MARIA, null);
        Locacao duplicada = new Locacao();
        duplicada.setCliente(clientes.getReferenceById(cliente.id()));
        duplicada.setBicicleta(bicicletas.getReferenceById(bicicleta.id()));
        duplicada.setBicicletaAtiva(bicicletas.getReferenceById(bicicleta.id()));
        duplicada.setDataRetirada(LocalDateTime.now(clock));
        duplicada.setDataDevolucaoPrevista(LocalDateTime.now(clock).plusHours(1));
        duplicada.setValorHora(new BigDecimal("10.00"));
        duplicada.setCartaoFinal("1111");
        assertThatThrownBy(() -> locacoes.saveAndFlush(duplicada)).isInstanceOf(DataIntegrityViolationException.class);
        assertThat(locacoes.count()).isEqualTo(1);
    }

    @Test
    void documentacao_IncluiJwtBicicletasLocacoesDevolucoesERelatorio() {
        client.get().uri("/docs-bikes").exchange().expectStatus().isOk().expectBody()
                .jsonPath("$.components.securitySchemes.bearerAuth.scheme").isEqualTo("bearer")
                .jsonPath("$.paths['/api/v1/auth/login'].post").exists()
                .jsonPath("$.paths['/api/v1/bicicletas'].post.responses['201']").exists()
                .jsonPath("$.paths['/api/v1/locacoes'].post.security[0].bearerAuth").isArray()
                .jsonPath("$.paths['/api/v1/locacoes/{id}/devolucao'].post").exists()
                .jsonPath("$.paths['/api/v1/relatorios/locacoes'].get").exists();
    }

    String token(String username) {
        return tokens.computeIfAbsent(username, user -> {
            TokenResponseDTO response = client.post().uri("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(new LoginRequestDTO(user, "123456")).exchange().expectStatus().isOk()
                    .expectHeader().valueEquals("Cache-Control", "no-store")
                    .expectBody(TokenResponseDTO.class).returnResult().getResponseBody();
            assertThat(response).isNotNull();
            assertThat(response.tokenType()).isEqualTo("Bearer");
            assertThat(response.expiresIn()).isEqualTo(3600);
            return response.accessToken();
        });
    }

    ClienteResponseDTO cadastrarCliente(String username) {
        return client.post().uri("/api/v1/clientes").headers(h -> h.setBearerAuth(token(username)))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("nome", username.equals(MARIA) ? "Maria da Silva" : "João da Silva",
                        "cpf", username.equals(MARIA) ? "52998224725" : "11144477735"))
                .exchange().expectStatus().isCreated().expectBody(ClienteResponseDTO.class).returnResult().getResponseBody();
    }

    BicicletaResponseDTO cadastrarBicicleta(String codigo) {
        return client.post().uri("/api/v1/bicicletas").headers(h -> h.setBearerAuth(token(ADMIN)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(Map.of("codigo", codigo, "modelo", "Urbana"))
                .exchange().expectStatus().isCreated().expectHeader().exists("Location")
                .expectBody(BicicletaResponseDTO.class).returnResult().getResponseBody();
    }

    WebTestClient.ResponseSpec alterarStatus(String codigo, String status) {
        Map<String, Object> body = new HashMap<>();
        body.put("status", status);
        return client.patch().uri("/api/v1/bicicletas/{codigo}/status", codigo).headers(h -> h.setBearerAuth(token(ADMIN)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(body).exchange();
    }

    LocacaoResponseDTO criarLocacao(String usuario, String codigo) {
        return alugar(usuario, codigo).expectStatus().isCreated().expectHeader().exists("Location")
                .expectBody(LocacaoResponseDTO.class).returnResult().getResponseBody();
    }

    WebTestClient.ResponseSpec alugar(String usuario, String codigo) {
        return client.post().uri("/api/v1/locacoes").headers(h -> h.setBearerAuth(token(usuario)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(pedido(codigo)).exchange();
    }

    Map<String, Object> pedido(String codigo) {
        Map<String, Object> body = new HashMap<>();
        if (codigo != null) body.put("codigoBicicleta", codigo);
        body.put("dataDevolucaoPrevista", LocalDateTime.now(clock).plusHours(1).toString());
        body.put("cartao", cartao());
        return body;
    }

    Map<String, Object> cartao() {
        return Map.of("titular", "Maria da Silva", "numero", "4111111111111111", "cvv", "123", "mesValidade", 12, "anoValidade", 2035);
    }

    WebTestClient.ResponseSpec devolver(String usuario, Long id, boolean manutencao) {
        return client.post().uri("/api/v1/locacoes/{id}/devolucao", id).headers(h -> h.setBearerAuth(token(usuario)))
                .contentType(MediaType.APPLICATION_JSON).bodyValue(Map.of("manutencao", manutencao)).exchange();
    }

    void avancar(Duration duration) { clock.advance(duration); tokens.clear(); }

    EntityExchangeResult<byte[]> alugarAposEspera(Map<String, Object> body, Duration espera) throws Exception {
        String accessToken = token(MARIA);
        try (ExecutorService executor = Executors.newSingleThreadExecutor();
                var connection = Objects.requireNonNull(jdbc.getDataSource()).getConnection()) {
            connection.setAutoCommit(false);
            try (var statement = connection.prepareStatement("select id from bicicletas where codigo = 'BIKE-001' for update");
                    var rows = statement.executeQuery()) {
                assertThat(rows.next()).isTrue();
            }
            Future<EntityExchangeResult<byte[]>> response = executor.submit(() -> client.post().uri("/api/v1/locacoes")
                    .headers(h -> h.setBearerAuth(accessToken)).contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body).exchange().expectBody().returnResult());
            await().pollInterval(Duration.ofMillis(20)).atMost(Duration.ofSeconds(5)).until(() ->
                    jdbc.queryForObject("select count(*) from information_schema.sessions where session_state = 'BLOCKED'",
                            Long.class) > 0);
            avancar(espera);
            connection.commit();
            return response.get(15, TimeUnit.SECONDS);
        }
    }

    List<Integer> simultaneo(Supplier<Integer> first, Supplier<Integer> second) throws Exception {
        CountDownLatch inicio = new CountDownLatch(1);
        try (ExecutorService executor = Executors.newFixedThreadPool(2)) {
            List<Future<Integer>> results = new ArrayList<>();
            for (Supplier<Integer> action : List.of(first, second)) {
                results.add(executor.submit(() -> {
                    if (!inicio.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Início não liberado");
                    return action.get();
                }));
            }
            inicio.countDown();
            return List.of(results.get(0).get(30, TimeUnit.SECONDS), results.get(1).get(30, TimeUnit.SECONDS));
        }
    }

    @TestConfiguration
    static class TempoConfig {
        @Bean @Primary RelogioTeste relogioTeste() { return new RelogioTeste(); }
    }

    static class RelogioTeste extends Clock {
        private final AtomicReference<Instant> instante = new AtomicReference<>();
        RelogioTeste() { reset(); }
        void reset() { instante.set(Instant.parse("2030-01-01T15:00:00Z")); }
        void advance(Duration duration) { instante.updateAndGet(value -> value.plus(duration)); }
        @Override public ZoneId getZone() { return ZoneId.of("America/Sao_Paulo"); }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(instant(), zone); }
        @Override public Instant instant() { return instante.get(); }
    }
}
