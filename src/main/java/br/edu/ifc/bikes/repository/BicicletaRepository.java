package br.edu.ifc.bikes.repository;

import br.edu.ifc.bikes.entity.Bicicleta;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;

public interface BicicletaRepository extends JpaRepository<Bicicleta, Long> {
    Optional<Bicicleta> findByCodigo(String codigo);
    boolean existsByCodigo(String codigo);
    List<Bicicleta> findAllByOrderByCodigoAsc();
    Optional<Bicicleta> findByCodigoAndAtivoTrue(String codigo);
    List<Bicicleta> findAllByAtivoTrueOrderByCodigoAsc();
    List<Bicicleta> findByStatusAndAtivoTrueOrderByModeloAsc(Bicicleta.Status status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Bicicleta b where b.codigo = :codigo and b.ativo = true")
    Optional<Bicicleta> findByCodigoForUpdate(String codigo);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Bicicleta> findFirstByStatusOrderByIdAsc(Bicicleta.Status status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Bicicleta> findFirstByStatusAndAtivoTrueOrderByIdAsc(Bicicleta.Status status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Bicicleta> findFirstByStatusAndAtivoTrueAndModeloIgnoreCaseOrderByIdAsc(Bicicleta.Status status, String modelo);
}
