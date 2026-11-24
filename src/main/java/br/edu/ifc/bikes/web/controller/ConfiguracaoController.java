package br.edu.ifc.bikes.web.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;

@RestController
@Tag(name = "Configuração", description = "Tarifa e fuso usados pela interface")
public class ConfiguracaoController {
    private final ConfiguracaoResponse configuracao;

    public ConfiguracaoController(@Value("${bikes.locacao.valor-hora:10.00}") BigDecimal valorHora,
            @Value("${bikes.timezone:America/Sao_Paulo}") String timezone) {
        this.configuracao = new ConfiguracaoResponse(valorHora, timezone);
    }

    @GetMapping("/api/v1/configuracao")
    @Operation(summary = "Consultar a tarifa e o fuso da locadora", description = "Configuração pública, sem credenciais.")
    public ConfiguracaoResponse get() { return configuracao; }

    public record ConfiguracaoResponse(BigDecimal valorHora, String timezone) { }
}
