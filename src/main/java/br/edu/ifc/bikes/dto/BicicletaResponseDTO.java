package br.edu.ifc.bikes.dto;

import br.edu.ifc.bikes.entity.Bicicleta;
import java.time.LocalDateTime;

public record BicicletaResponseDTO(Long id, String codigo, String modelo, Bicicleta.Status status,
        LocalDateTime dataCriacao, LocalDateTime dataModificacao, String criadoPor, String modificadoPor) {
    public static BicicletaResponseDTO from(Bicicleta bicicleta) {
        return new BicicletaResponseDTO(bicicleta.getId(), bicicleta.getCodigo(), bicicleta.getModelo(),
                bicicleta.getStatus(), bicicleta.getDataCriacao(), bicicleta.getDataModificacao(),
                bicicleta.getCriadoPor(), bicicleta.getModificadoPor());
    }
}
