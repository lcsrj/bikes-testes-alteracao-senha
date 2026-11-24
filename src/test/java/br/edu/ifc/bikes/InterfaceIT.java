package br.edu.ifc.bikes;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.MediaType;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.util.Map;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Sql(scripts = "/sql/usuarios/usuarios-insert.sql", executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
@Sql(scripts = "/sql/usuarios/usuarios-delete.sql", executionPhase = Sql.ExecutionPhase.AFTER_TEST_METHOD)
class InterfaceIT {
    @LocalServerPort int port;
    WebTestClient client;

    @BeforeEach
    void setup() {
        client = WebTestClient.bindToServer().baseUrl("http://localhost:" + port).build();
    }

    @Test
    void arquivosDaInterfaceSaoPublicosMasApisContinuamProtegidas() {
        for (String path : new String[]{"/", "/index.html", "/assets/app.js", "/assets/ui.js", "/assets/api.js", "/assets/styles.css", "/assets/city-bike.png", "/favicon.svg"}) {
            client.get().uri(path).exchange().expectStatus().isOk();
        }
        for (String path : new String[]{"/api/v1/auth/me", "/api/v1/clientes/me", "/api/v1/bicicletas", "/api/v1/relatorios/locacoes"}) {
            client.get().uri(path).exchange().expectStatus().isUnauthorized();
        }
    }

    @Test
    void configuracaoPublicaRetornaSomenteTarifaEFuso() {
        client.get().uri("/api/v1/configuracao").exchange().expectStatus().isOk()
                .expectBody().jsonPath("$.valorHora").isEqualTo(10.0)
                .jsonPath("$.timezone").isEqualTo("America/Sao_Paulo")
                .jsonPath("$.password").doesNotExist().jsonPath("$.secret").doesNotExist();
    }

    @Test
    void contaAtualUsaIdentidadeDoTokenSemExporSenha() {
        var response = client.post().uri("/api/v1/auth/login").contentType(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("username", "maria@gmail.com", "password", "123456"))
                .exchange().expectStatus().isOk().expectBody(Map.class).returnResult().getResponseBody();
        client.get().uri("/api/v1/auth/me").headers(h -> h.setBearerAuth((String) response.get("accessToken")))
                .exchange().expectStatus().isOk().expectBody()
                .jsonPath("$.id").isEqualTo(101).jsonPath("$.username").isEqualTo("maria@gmail.com")
                .jsonPath("$.role").isEqualTo("CLIENTE").jsonPath("$.password").doesNotExist();
    }

    @Test
    void contaAtualTambemIdentificaAdministradorERejeitaTokenInvalido() {
        client.get().uri("/api/v1/auth/me").headers(h -> h.setBasicAuth("jose@gmail.com", "123456"))
                .exchange().expectStatus().isOk().expectBody().jsonPath("$.role").isEqualTo("ADMIN");
        client.get().uri("/api/v1/auth/me").headers(h -> h.setBearerAuth("invalido"))
                .exchange().expectStatus().isUnauthorized();
    }

    @Test
    void requisicaoDaInterfaceNaoAbreDialogoBasicDoNavegador() {
        client.get().uri("/api/v1/auth/me").header("X-Requested-With", "XMLHttpRequest")
                .exchange().expectStatus().isUnauthorized()
                .expectHeader().valueEquals("WWW-Authenticate", "Bearer realm=\"Bikes API\"");
    }

    @Test
    void arquivosPublicosNaoConcedemPermissoesAdministrativas() {
        client.get().uri("/api/v1/bicicletas").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .exchange().expectStatus().isForbidden();
        client.get().uri("/api/v1/clientes").headers(h -> h.setBasicAuth("maria@gmail.com", "123456"))
                .exchange().expectStatus().isForbidden();
    }
}
