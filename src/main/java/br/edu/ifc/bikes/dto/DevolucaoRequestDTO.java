package br.edu.ifc.bikes.dto;

import io.swagger.v3.oas.annotations.media.Schema;

public record DevolucaoRequestDTO(
        @Schema(description = "Informe true quando houver problema; a bicicleta ficará em manutenção.") boolean manutencao
) { }
