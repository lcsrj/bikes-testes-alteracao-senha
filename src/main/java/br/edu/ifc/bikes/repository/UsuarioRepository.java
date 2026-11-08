package br.edu.ifc.bikes.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import br.edu.ifc.bikes.entity.Usuario;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByUsername(String username);
}
