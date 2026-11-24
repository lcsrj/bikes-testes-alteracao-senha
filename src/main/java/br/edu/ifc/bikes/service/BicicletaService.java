package br.edu.ifc.bikes.service;

import br.edu.ifc.bikes.dto.*;
import br.edu.ifc.bikes.entity.Bicicleta;
import br.edu.ifc.bikes.entity.Locacao;
import br.edu.ifc.bikes.exception.EntityNotFoundException;
import br.edu.ifc.bikes.exception.NegocioException;
import br.edu.ifc.bikes.repository.BicicletaRepository;
import br.edu.ifc.bikes.repository.LocacaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Transactional(readOnly = true)
public class BicicletaService {
    private final BicicletaRepository bicicletaRepository;
    private final LocacaoRepository locacaoRepository;

    @Transactional
    public BicicletaResponseDTO create(BicicletaRequestDTO request) {
        if (bicicletaRepository.existsByCodigo(request.codigo())) {
            throw new NegocioException("O código da bicicleta já está cadastrado");
        }
        Bicicleta bicicleta = new Bicicleta();
        bicicleta.setCodigo(request.codigo());
        bicicleta.setModelo(request.modelo());
        try {
            return BicicletaResponseDTO.from(bicicletaRepository.saveAndFlush(bicicleta));
        } catch (DataIntegrityViolationException ex) {
            throw new NegocioException("O código da bicicleta já está cadastrado");
        }
    }

    public BicicletaResponseDTO getByCodigo(String codigo) {
        return BicicletaResponseDTO.from(bicicletaRepository.findByCodigoAndAtivoTrue(normalizar(codigo))
                .orElseThrow(() -> new EntityNotFoundException("Bicicleta não encontrada")));
    }

    public List<BicicletaResponseDTO> getAll() {
        return bicicletaRepository.findAllByAtivoTrueOrderByCodigoAsc().stream().map(BicicletaResponseDTO::from).toList();
    }

    @Transactional
    public BicicletaResponseDTO updateStatus(String codigo, BicicletaStatusDTO request) {
        Bicicleta bicicleta = bicicletaRepository.findByCodigoForUpdate(normalizar(codigo))
                .orElseThrow(() -> new EntityNotFoundException("Bicicleta não encontrada"));
        if (request.status() == Bicicleta.Status.OCUPADA) {
            throw new NegocioException("O status OCUPADA é definido somente por uma locação");
        }
        if (bicicleta.getStatus() == Bicicleta.Status.OCUPADA
                || locacaoRepository.existsByBicicletaIdAndStatus(bicicleta.getId(), Locacao.Status.ATIVA)) {
            throw new NegocioException("Não é possível alterar o status de uma bicicleta em locação");
        }
        bicicleta.setStatus(request.status());
        return BicicletaResponseDTO.from(bicicletaRepository.saveAndFlush(bicicleta));
    }

    private String normalizar(String codigo) { return codigo.strip().toUpperCase(Locale.ROOT); }

    @Transactional
    public void excluir(String codigo) {
        Bicicleta bicicleta = bicicletaRepository.findByCodigoForUpdate(normalizar(codigo))
                .orElseThrow(() -> new EntityNotFoundException("Bicicleta não encontrada"));
        if (bicicleta.getStatus() == Bicicleta.Status.OCUPADA
                || locacaoRepository.existsByBicicletaIdAndStatus(bicicleta.getId(), Locacao.Status.ATIVA)) {
            throw new NegocioException("Devolva a bicicleta antes de excluí-la da frota");
        }
        bicicleta.setAtivo(false);
        bicicletaRepository.saveAndFlush(bicicleta);
    }
}
