package br.edu.ifc.bikes.repository;

import br.edu.ifc.bikes.entity.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    boolean existsByCpf(String cpf);
    boolean existsByUsuarioId(Long usuarioId);
    Optional<Cliente> findByUsuarioId(Long usuarioId);
}
