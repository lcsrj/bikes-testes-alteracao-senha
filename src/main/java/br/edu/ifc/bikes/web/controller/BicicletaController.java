package br.edu.ifc.bikes.web.controller;

import br.edu.ifc.bikes.dto.*;
import br.edu.ifc.bikes.service.BicicletaService;
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
@RequestMapping("/api/v1/bicicletas")
@RequiredArgsConstructor
@Tag(name = "Bicicletas", description = "Cadastro, consulta e manutenção da frota. Acesso exclusivo de ADMIN.")
@SecurityRequirement(name = "bearerAuth")
@ApiResponses({
        @ApiResponse(responseCode = "401", description = "Autenticação obrigatória", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "403", description = "Acesso exclusivo de ADMIN", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "404", description = "Bicicleta não encontrada", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "409", description = "Código duplicado ou alteração incompatível com uma locação", content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
        @ApiResponse(responseCode = "422", description = "Campos inválidos", content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
})
public class BicicletaController {
    private final BicicletaService bicicletaService;

    @PostMapping
    @Operation(summary = "Cadastrar bicicleta", description = "O código é único, independente do ID. O status inicial é LIVRE.")
    @ApiResponse(responseCode = "201", description = "Bicicleta cadastrada", content = @Content(schema = @Schema(implementation = BicicletaResponseDTO.class)))
    public ResponseEntity<BicicletaResponseDTO> create(@Valid @RequestBody BicicletaRequestDTO request) {
        BicicletaResponseDTO bicicleta = bicicletaService.create(request);
        return ResponseEntity.created(URI.create("/api/v1/bicicletas/" + bicicleta.codigo())).body(bicicleta);
    }

    @GetMapping
    @Operation(summary = "Listar bicicletas")
    public List<BicicletaResponseDTO> getAll() { return bicicletaService.getAll(); }

    @GetMapping("/{codigo}")
    @Operation(summary = "Consultar bicicleta pelo código")
    public BicicletaResponseDTO getByCodigo(@PathVariable String codigo) { return bicicletaService.getByCodigo(codigo); }

    @PatchMapping("/{codigo}/status")
    @Operation(summary = "Liberar bicicleta ou encaminhar para manutenção",
            description = "Permite LIVRE e MANUTENCAO quando não há locação ativa. OCUPADA é controlado pelo sistema.")
    public BicicletaResponseDTO updateStatus(@PathVariable String codigo, @Valid @RequestBody BicicletaStatusDTO request) {
        return bicicletaService.updateStatus(codigo, request);
    }

    @DeleteMapping("/{codigo}")
    @Operation(summary = "Excluir uma bicicleta da frota", description = "Remove da frota e do catálogo, preservando as locações históricas e reservando seu código. Bicicletas em uso não podem ser excluídas.")
    @ApiResponse(responseCode = "204", description = "Bicicleta removida da frota")
    public ResponseEntity<Void> delete(@PathVariable String codigo) {
        bicicletaService.excluir(codigo);
        return ResponseEntity.noContent().build();
    }
}
