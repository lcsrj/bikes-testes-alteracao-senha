package br.edu.ifc.bikes.service;

import br.edu.ifc.bikes.dto.*;
import br.edu.ifc.bikes.entity.*;
import br.edu.ifc.bikes.exception.*;
import br.edu.ifc.bikes.repository.*;
import br.edu.ifc.bikes.security.UsuarioAtual;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@PreAuthorize("isAuthenticated()")
@Transactional(readOnly = true)
public class LocacaoService {
    private final LocacaoRepository locacaoRepository;
    private final BicicletaRepository bicicletaRepository;
    private final ClienteRepository clienteRepository;
    private final UsuarioAtual usuarioAtual;
    private final Clock clock;
    private final BigDecimal valorHora;

    public LocacaoService(LocacaoRepository locacaoRepository, BicicletaRepository bicicletaRepository,
            ClienteRepository clienteRepository, UsuarioAtual usuarioAtual, Clock clock,
            @Value("${bikes.locacao.valor-hora:10.00}") BigDecimal valorHora) {
        if (valorHora.signum() <= 0 || valorHora.scale() > 2 || valorHora.compareTo(new BigDecimal("999999.99")) > 0) {
            throw new IllegalArgumentException("A tarifa deve ser positiva, ter até duas casas decimais e não exceder 999999.99");
        }
        this.locacaoRepository = locacaoRepository;
        this.bicicletaRepository = bicicletaRepository;
        this.clienteRepository = clienteRepository;
        this.usuarioAtual = usuarioAtual;
        this.clock = clock;
        this.valorHora = valorHora.setScale(2);
    }

    @Transactional
    @PreAuthorize("hasRole('CLIENTE')")
    public LocacaoResponseDTO create(LocacaoRequestDTO request) {
        Cliente cliente = clienteRepository.findByUsuarioId(usuarioAtual.get().getId())
                .orElseThrow(() -> new NegocioException("Cadastre seus dados de cliente antes de solicitar uma locação"));
        LocalDateTime retirada = agora();
        if (!request.dataDevolucaoPrevista().isAfter(retirada)) {
            throw new DadosInvalidosException("A devolução prevista deve ser posterior à retirada");
        }
        CartaoRequestDTO cartao = request.cartao();
        if (YearMonth.of(cartao.anoValidade(), cartao.mesValidade()).isBefore(YearMonth.now(clock))) {
            throw new DadosInvalidosException("O cartão está vencido");
        }
        Bicicleta bicicleta = request.codigoBicicleta() == null
                ? bicicletaRepository.findFirstByStatusOrderByIdAsc(Bicicleta.Status.LIVRE)
                    .orElseThrow(() -> new NegocioException("Não há bicicletas disponíveis"))
                : bicicletaRepository.findByCodigoForUpdate(request.codigoBicicleta())
                    .orElseThrow(() -> new EntityNotFoundException("Bicicleta não encontrada"));
        if (bicicleta.getStatus() != Bicicleta.Status.LIVRE) {
            throw new NegocioException("A bicicleta não está disponível");
        }
        bicicleta.setStatus(Bicicleta.Status.OCUPADA);
        Locacao locacao = new Locacao();
        locacao.setCliente(cliente);
        locacao.setBicicleta(bicicleta);
        locacao.setBicicletaAtiva(bicicleta);
        locacao.setDataRetirada(retirada);
        locacao.setDataDevolucaoPrevista(request.dataDevolucaoPrevista());
        locacao.setValorHora(valorHora);
        locacao.setCartaoFinal(cartao.numero().substring(cartao.numero().length() - 4));
        try {
            return resposta(locacaoRepository.saveAndFlush(locacao), retirada);
        } catch (DataIntegrityViolationException ex) {
            throw new NegocioException("A bicicleta já está em uma locação ativa");
        }
    }

    public LocacaoResponseDTO getById(Long id) {
        Locacao locacao = buscar(id);
        autorizar(locacao);
        return resposta(locacao, agora());
    }

    @PreAuthorize("hasRole('CLIENTE')")
    public List<LocacaoResponseDTO> getMe() {
        Cliente cliente = clienteRepository.findByUsuarioId(usuarioAtual.get().getId())
                .orElseThrow(() -> new EntityNotFoundException("Cliente não cadastrado"));
        LocalDateTime agora = agora();
        return locacaoRepository.findByClienteIdOrderByDataRetiradaDescIdDesc(cliente.getId()).stream()
                .map(locacao -> resposta(locacao, agora)).toList();
    }

    @Transactional
    public LocacaoResponseDTO devolver(Long id, DevolucaoRequestDTO request) {
        Locacao locacao = locacaoRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new EntityNotFoundException("Locação não encontrada"));
        autorizar(locacao);
        if (locacao.getStatus() != Locacao.Status.ATIVA) {
            throw new NegocioException("A locação já foi finalizada");
        }
        Bicicleta bicicleta = bicicletaRepository.findByCodigoForUpdate(locacao.getBicicleta().getCodigo())
                .orElseThrow(() -> new EntityNotFoundException("Bicicleta não encontrada"));
        LocalDateTime devolucao = agora();
        long segundos = duracao(locacao, devolucao);
        BigDecimal valor = locacao.getValorHora().multiply(BigDecimal.valueOf(Math.max(60, segundos)))
                .divide(BigDecimal.valueOf(3600), 2, RoundingMode.HALF_UP);
        locacao.setDataDevolucao(devolucao);
        locacao.setDuracaoSegundos(segundos);
        locacao.setValor(valor);
        locacao.setStatus(Locacao.Status.FINALIZADA);
        locacao.setBicicletaAtiva(null);
        bicicleta.setStatus(request.manutencao() ? Bicicleta.Status.MANUTENCAO : Bicicleta.Status.LIVRE);
        return resposta(locacaoRepository.saveAndFlush(locacao), devolucao);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<RelatorioLocacaoDTO> relatorio(Locacao.Status status) {
        List<Locacao> locacoes = status == null ? locacaoRepository.findAllByOrderByDataRetiradaDescIdDesc()
                : locacaoRepository.findByStatusOrderByDataRetiradaDescIdDesc(status);
        LocalDateTime agora = agora();
        return locacoes.stream().map(locacao -> RelatorioLocacaoDTO.from(locacao, duracao(locacao, agora))).toList();
    }

    private Locacao buscar(Long id) {
        return locacaoRepository.findById(id).orElseThrow(() -> new EntityNotFoundException("Locação não encontrada"));
    }

    private void autorizar(Locacao locacao) {
        Usuario usuario = usuarioAtual.get();
        if (usuario.getRole() != Usuario.Role.ADMIN && !locacao.getCliente().getUsuario().getId().equals(usuario.getId())) {
            throw new AccessDeniedException("A locação pertence a outro cliente");
        }
    }

    private LocalDateTime agora() { return LocalDateTime.now(clock).truncatedTo(ChronoUnit.MICROS); }

    private long duracao(Locacao locacao, LocalDateTime agora) {
        return locacao.getStatus() == Locacao.Status.FINALIZADA ? locacao.getDuracaoSegundos()
                : Math.max(0, Duration.between(locacao.getDataRetirada(), agora).getSeconds());
    }

    private LocacaoResponseDTO resposta(Locacao locacao, LocalDateTime agora) {
        return LocacaoResponseDTO.from(locacao, duracao(locacao, agora));
    }
}
