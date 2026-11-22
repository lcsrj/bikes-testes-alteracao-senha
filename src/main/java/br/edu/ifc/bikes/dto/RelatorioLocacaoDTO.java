package br.edu.ifc.bikes.dto;

import br.edu.ifc.bikes.entity.Locacao;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record RelatorioLocacaoDTO(Long locacaoId, String nomeCliente, String codigoBicicleta,
        LocalDateTime dataRetirada, LocalDateTime dataDevolucaoPrevista, LocalDateTime dataDevolucao,
        long duracaoSegundos, Locacao.Status status, BigDecimal valor) {
    public static RelatorioLocacaoDTO from(Locacao locacao, long duracaoSegundos) {
        return new RelatorioLocacaoDTO(locacao.getId(), locacao.getCliente().getNome(), locacao.getBicicleta().getCodigo(),
                locacao.getDataRetirada(), locacao.getDataDevolucaoPrevista(), locacao.getDataDevolucao(),
                duracaoSegundos, locacao.getStatus(), locacao.getValor());
    }
}
