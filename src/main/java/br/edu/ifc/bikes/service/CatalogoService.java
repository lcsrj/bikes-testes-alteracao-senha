package br.edu.ifc.bikes.service;

import br.edu.ifc.bikes.dto.ModeloDisponivelDTO;
import br.edu.ifc.bikes.entity.Bicicleta;
import br.edu.ifc.bikes.repository.BicicletaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
@PreAuthorize("hasRole('CLIENTE')")
public class CatalogoService {
    private final BicicletaRepository bicicletas;

    public List<ModeloDisponivelDTO> modelosDisponiveis() {
        Map<String, Long> modelos = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (Bicicleta bicicleta : bicicletas.findByStatusAndAtivoTrueOrderByModeloAsc(Bicicleta.Status.LIVRE)) {
            modelos.merge(bicicleta.getModelo(), 1L, Long::sum);
        }
        return modelos.entrySet().stream().map(item -> new ModeloDisponivelDTO(item.getKey(), item.getValue())).toList();
    }
}
