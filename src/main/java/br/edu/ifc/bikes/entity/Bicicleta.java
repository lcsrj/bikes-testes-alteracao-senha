package br.edu.ifc.bikes.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "bicicletas")
@Getter
@Setter
public class Bicicleta extends EntidadeAuditavel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 30)
    private String codigo;

    @Column(nullable = false, length = 100)
    private String modelo;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean ativo = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.LIVRE;

    public enum Status { LIVRE, OCUPADA, MANUTENCAO }

    @Override
    public boolean equals(Object obj) {
        return this == obj || obj instanceof Bicicleta outra && getId() != null && getId().equals(outra.getId());
    }

    @Override
    public int hashCode() { return Bicicleta.class.hashCode(); }
}
