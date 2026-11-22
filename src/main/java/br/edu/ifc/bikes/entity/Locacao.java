package br.edu.ifc.bikes.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "locacoes")
@Getter
@Setter
public class Locacao extends EntidadeAuditavel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bicicleta_id", nullable = false)
    private Bicicleta bicicleta;

    // O vínculo é liberado na devolução; a unicidade impede duas locações ativas da mesma bicicleta.
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bicicleta_ativa_id", unique = true)
    private Bicicleta bicicletaAtiva;

    @Column(nullable = false)
    private LocalDateTime dataRetirada;

    @Column(nullable = false)
    private LocalDateTime dataDevolucaoPrevista;

    private LocalDateTime dataDevolucao;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal valorHora;

    @Column(precision = 12, scale = 2)
    private BigDecimal valor;

    private Long duracaoSegundos;

    @Column(nullable = false, length = 4)
    private String cartaoFinal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ATIVA;

    public enum Status { ATIVA, FINALIZADA }

    @Override
    public boolean equals(Object obj) {
        return this == obj || obj instanceof Locacao outra && getId() != null && getId().equals(outra.getId());
    }

    @Override
    public int hashCode() { return Locacao.class.hashCode(); }
}
