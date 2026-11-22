package br.edu.ifc.bikes.repository;

import br.edu.ifc.bikes.entity.Locacao;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface LocacaoRepository extends JpaRepository<Locacao, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from Locacao l where l.id = :id")
    Optional<Locacao> findByIdForUpdate(Long id);

    @EntityGraph(attributePaths = {"cliente", "bicicleta"})
    List<Locacao> findAllByOrderByDataRetiradaDescIdDesc();

    @EntityGraph(attributePaths = {"cliente", "bicicleta"})
    List<Locacao> findByClienteIdOrderByDataRetiradaDescIdDesc(Long clienteId);

    @EntityGraph(attributePaths = {"cliente", "bicicleta"})
    List<Locacao> findByStatusOrderByDataRetiradaDescIdDesc(Locacao.Status status);

    boolean existsByBicicletaIdAndStatus(Long bicicletaId, Locacao.Status status);
}
