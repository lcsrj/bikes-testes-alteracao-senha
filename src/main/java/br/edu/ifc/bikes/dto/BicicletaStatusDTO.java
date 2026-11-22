package br.edu.ifc.bikes.dto;

import br.edu.ifc.bikes.entity.Bicicleta;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

public record BicicletaStatusDTO(
        @NotNull @Schema(description = "LIVRE ou MANUTENCAO. OCUPADA é controlado pela locação.") Bicicleta.Status status
) { }
