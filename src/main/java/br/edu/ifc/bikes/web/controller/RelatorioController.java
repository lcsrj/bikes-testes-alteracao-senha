package br.edu.ifc.bikes.web.controller;

import br.edu.ifc.bikes.dto.RelatorioLocacaoDTO;
import br.edu.ifc.bikes.entity.Locacao;
import br.edu.ifc.bikes.service.LocacaoService;
import br.edu.ifc.bikes.web.exception.ErrorMessage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.*;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/relatorios")
@RequiredArgsConstructor
@Tag(name = "Relatórios", description = "Relatório administrativo de locações e devoluções")
@SecurityRequirement(name = "bearerAuth")
@ApiResponses({
        @ApiResponse(responseCode = "401", description = "Autenticação obrigatória", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "403", description = "Acesso exclusivo de ADMIN", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "400", description = "Filtro de status inválido", content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
})
public class RelatorioController {
    private final LocacaoService locacaoService;

    @GetMapping("/locacoes")
    @Operation(summary = "Relatório de locações e devoluções",
            description = "Exclusivo de ADMIN. Lista cliente, código da bicicleta, datas, duração em segundos, status e valor. Sem filtro, inclui todas as locações; devolução e valor são nulos enquanto a locação estiver ativa.")
    public List<RelatorioLocacaoDTO> locacoes(@RequestParam(required = false) Locacao.Status status) {
        return locacaoService.relatorio(status);
    }
}
