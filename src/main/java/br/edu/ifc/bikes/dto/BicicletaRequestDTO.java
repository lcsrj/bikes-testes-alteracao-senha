package br.edu.ifc.bikes.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Locale;

public record BicicletaRequestDTO(
        @NotBlank @Pattern(regexp = "[A-Z0-9_-]{3,30}")
        @Schema(example = "BIKE-001", description = "Código único, diferente do identificador interno") String codigo,
        @NotBlank @Size(min = 2, max = 100) @Schema(example = "Mountain Bike aro 29") String modelo
) {
    public BicicletaRequestDTO {
        if (codigo != null) codigo = codigo.strip().toUpperCase(Locale.ROOT);
        if (modelo != null) modelo = modelo.strip();
    }
}
