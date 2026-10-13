package br.edu.ifc.bikes;

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
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Sql(scripts = "/sql/usuarios/usuarios-insert.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@Sql(scripts = "/sql/usuarios/usuarios-delete.sql", executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)
public class UsuarioSenhaTest {

    @LocalServerPort
    private int port;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private WebTestClient testClient;

    @BeforeEach
    void setUp() {
        testClient = WebTestClient.bindToServer()
                .baseUrl("http://localhost:" + port)
                .build();
    }

    @Test
    void alterarSenha_DadosValidos_RetornaStatus204SemCorpo() {
        alterarSenha(100L, senhas("123456", "654321", "654321"))
                .expectStatus().isNoContent()
                .expectBody().isEmpty();

        assertSenha(100L, "654321");
        assertSenha(101L, "123456");
    }

    @Test
    void alterarSenha_SenhaAtualIncorreta_RetornaStatus400() {
        alterarSenha(100L, senhas("000000", "654321", "654321"))
                .expectStatus().isBadRequest();

        assertSenha(100L, "123456");
    }

    @Test
    void alterarSenha_ConfirmacaoDiferente_RetornaStatus400() {
        alterarSenha(100L, senhas("123456", "654321", "654322"))
                .expectStatus().isBadRequest();

        assertSenha(100L, "123456");
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("camposInvalidos")
    void alterarSenha_CampoInvalido_RetornaStatus422(
            String campo, String cenario, String valor, boolean omitir) {
        Map<String, Object> body = senhas("123456", "654321", "654321");
        if (omitir) {
            body.remove(campo);
        } else {
            body.put(campo, valor);
        }

        alterarSenha(100L, body).expectStatus().isEqualTo(422);

        assertSenha(100L, "123456");
    }

    static Stream<Arguments> camposInvalidos() {
        return Stream.of("senhaAtual", "novaSenha", "confirmaSenha")
                .flatMap(campo -> Stream.of(
                        Arguments.of(campo, "vazio", "", false),
                        Arguments.of(campo, "apenas espaços", "      ", false),
                        Arguments.of(campo, "menos de seis caracteres", "12345", false),
                        Arguments.of(campo, "mais de seis caracteres", "1234567", false),
                        Arguments.of(campo, "nulo", null, false),
                        Arguments.of(campo, "ausente", null, true)));
    }

    @Test
    void alterarSenha_TodosOsCamposAusentes_RetornaStatus422() {
        alterarSenha(100L, Map.of()).expectStatus().isEqualTo(422);

        assertSenha(100L, "123456");
    }

    @Test
    void alterarSenha_UsuarioInexistente_RetornaStatus404() {
        alterarSenha(110L, senhas("123456", "654321", "654321"))
                .expectStatus().isNotFound();

        assertThat(usuarioRepository.findById(110L)).isEmpty();
        assertSenha(100L, "123456");
    }

    @Test
    void alterarSenha_SenhaAntigaAposAlteracao_RetornaStatus400() {
        alterarSenha(100L, senhas("123456", "654321", "654321"))
                .expectStatus().isNoContent()
                .expectBody().isEmpty();

        alterarSenha(100L, senhas("123456", "111111", "111111"))
                .expectStatus().isBadRequest();
        assertSenha(100L, "654321");

        alterarSenha(100L, senhas("654321", "111111", "111111"))
                .expectStatus().isNoContent()
                .expectBody().isEmpty();
        assertSenha(100L, "111111");
    }

    private WebTestClient.ResponseSpec alterarSenha(Long id, Map<String, ?> body) {
        return testClient.patch().uri("/api/v1/usuarios/{id}", id)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body).exchange();
    }

    private static Map<String, Object> senhas(String atual, String nova, String confirmacao) {
        Map<String, Object> body = new HashMap<>();
        body.put("senhaAtual", atual);
        body.put("novaSenha", nova);
        body.put("confirmaSenha", confirmacao);
        return body;
    }

    private void assertSenha(Long id, String senha) {
        assertThat(usuarioRepository.findById(id).orElseThrow().getPassword())
                .isEqualTo(senha);
    }
}
