package br.edu.ifc.bikes.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Modelo disponível para locação, sem expor os dados administrativos da frota")
public record ModeloDisponivelDTO(String modelo, long disponiveis) { }
