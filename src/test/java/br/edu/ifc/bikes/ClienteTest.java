package br.edu.ifc.bikes;

import br.edu.ifc.bikes.entity.Cliente;
import org.junit.jupiter.api.Test;

import java.util.HashSet;

import static org.assertj.core.api.Assertions.assertThat;

class ClienteTest {

    @Test
    void equals_ComparaIdSemIgualarEntidadesNovasOuOutrosTipos() {
        Cliente cliente = new Cliente();
        Cliente outro = new Cliente();
        assertThat(cliente.equals(cliente)).isTrue();
        assertThat(cliente.equals(outro)).isFalse();
        assertThat(cliente.equals(null)).isFalse();
        assertThat(cliente.equals("outro tipo")).isFalse();

        cliente.setId(1L);
        outro.setId(1L);
        outro.setNome("Outro nome");
        assertThat(cliente).isEqualTo(outro);
        assertThat(cliente.hashCode()).isEqualTo(outro.hashCode());
        outro.setId(2L);
        assertThat(cliente).isNotEqualTo(outro);
    }

    @Test
    void hashCode_PermaneceEstavelAoReceberId() {
        Cliente cliente = new Cliente();
        HashSet<Cliente> clientes = new HashSet<>();
        clientes.add(cliente);
        cliente.setId(1L);
        assertThat(clientes.contains(cliente)).isTrue();
    }
}
