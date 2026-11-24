package br.edu.ifc.bikes.dto;

import br.edu.ifc.bikes.entity.Locacao;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LocacaoResponseDTO(Long id, Long clienteId, String nomeCliente, String codigoBicicleta,
        LocalDateTime dataRetirada, LocalDateTime dataDevolucaoPrevista, LocalDateTime dataDevolucao,
        long duracaoSegundos, Locacao.Status status, BigDecimal valorHora, BigDecimal valor, String cartaoFinal, String modeloBicicleta) {
    public static LocacaoResponseDTO from(Locacao locacao, long duracaoSegundos) {
        return new LocacaoResponseDTO(locacao.getId(), locacao.getCliente().getId(), locacao.getCliente().getNome(),
                locacao.getBicicleta().getCodigo(), locacao.getDataRetirada(), locacao.getDataDevolucaoPrevista(),
                locacao.getDataDevolucao(), duracaoSegundos, locacao.getStatus(), locacao.getValorHora(),
                locacao.getValor(), locacao.getCartaoFinal(), locacao.getBicicleta().getModelo());
    }
}
