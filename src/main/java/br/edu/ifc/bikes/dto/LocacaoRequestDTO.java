package br.edu.ifc.bikes.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;
import java.util.Locale;

public record LocacaoRequestDTO(
        @Pattern(regexp = "[A-Z0-9_-]{3,30}")
        @Schema(description = "Opcional. Quando omitido, o sistema seleciona uma bicicleta livre.", example = "BIKE-001")
        String codigoBicicleta,
        @NotNull @Schema(example = "2030-12-01T18:00:00", description = "Horário local de America/Sao_Paulo, posterior à retirada")
        LocalDateTime dataDevolucaoPrevista,
        @NotNull @Valid CartaoRequestDTO cartao
) {
    public LocacaoRequestDTO {
        if (codigoBicicleta != null) codigoBicicleta = codigoBicicleta.strip().toUpperCase(Locale.ROOT);
    }
}
