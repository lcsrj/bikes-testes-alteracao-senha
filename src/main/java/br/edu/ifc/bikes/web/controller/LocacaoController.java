package br.edu.ifc.bikes.web.controller;

import br.edu.ifc.bikes.dto.*;
import br.edu.ifc.bikes.service.LocacaoService;
import br.edu.ifc.bikes.web.exception.ErrorMessage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api/v1/locacoes")
@RequiredArgsConstructor
@Tag(name = "Locações e devoluções", description = "Retirada, consulta e devolução de bicicletas")
@SecurityRequirement(name = "bearerAuth")
@ApiResponses({
        @ApiResponse(responseCode = "400", description = "Formato inválido", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "401", description = "Autenticação obrigatória", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "403", description = "Acesso não permitido", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "404", description = "Cliente, bicicleta ou locação não encontrado", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "409", description = "Sem disponibilidade, cliente não cadastrado ou locação já finalizada", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "422", description = "Dados inválidos, cartão vencido ou devolução prevista inválida", content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
})
public class LocacaoController {
    private final LocacaoService locacaoService;

    @PostMapping
    @Operation(summary = "Solicitar locação", description = "Exclusivo de CLIENTE cadastrado. O sistema reserva uma bicicleta livre e registra a retirada. Informe cartão de teste: não há processamento bancário.")
    @ApiResponse(responseCode = "201", description = "Locação criada", content = @Content(schema = @Schema(implementation = LocacaoResponseDTO.class)))
    public ResponseEntity<LocacaoResponseDTO> create(@Valid @RequestBody LocacaoRequestDTO request) {
        LocacaoResponseDTO locacao = locacaoService.create(request);
        return ResponseEntity.created(URI.create("/api/v1/locacoes/" + locacao.id())).body(locacao);
    }

    @GetMapping("/me")
    @Operation(summary = "Listar minhas locações", description = "Exclusivo de CLIENTE. Inclui locações ativas e finalizadas.")
    public List<LocacaoResponseDTO> getMe() { return locacaoService.getMe(); }

    @GetMapping("/{id}")
    @Operation(summary = "Consultar uma locação", description = "Acesso do próprio cliente ou de ADMIN.")
    public LocacaoResponseDTO getById(@PathVariable Long id) { return locacaoService.getById(id); }

    @PostMapping("/{id}/devolucao")
    @Operation(summary = "Devolver bicicleta",
            description = "Próprio cliente ou ADMIN. Registra o horário real, finaliza a locação e apresenta o valor a debitar. A tarifa da retirada é preservada; cobrança proporcional a segundos completos, com mínimo de 60 segundos. manutencao=true sinaliza problema e encaminha a bicicleta para manutenção.")
    public LocacaoResponseDTO devolver(@PathVariable Long id, @Valid @RequestBody DevolucaoRequestDTO request) {
        return locacaoService.devolver(id, request);
    }
}
