package br.edu.ifc.bikes.web.controller;

import br.edu.ifc.bikes.dto.ClienteRequestDTO;
import br.edu.ifc.bikes.dto.ClienteResponseDTO;
import br.edu.ifc.bikes.service.ClienteService;
import br.edu.ifc.bikes.web.exception.ErrorMessage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;

@Tag(name = "Clientes", description = "Cadastro vinculado ao usuário autenticado e consulta de clientes")
@SecurityRequirement(name = "basicAuth")
@ApiResponse(responseCode = "401", description = "Autenticação obrigatória ou credenciais inválidas",
        content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
@RestController
@RequestMapping("/api/v1/clientes")
@RequiredArgsConstructor
public class ClienteController {

    private final ClienteService clienteService;

    @Operation(summary = "Cadastrar o cliente do usuário autenticado",
            description = "O vínculo com usuário é obtido da autenticação. Cada usuário pode ter apenas um cliente.",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Cliente criado",
                            content = @Content(schema = @Schema(implementation = ClienteResponseDTO.class))),
                    @ApiResponse(responseCode = "409", description = "CPF ou usuário já cadastrado",
                            content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
                    @ApiResponse(responseCode = "422", description = "Nome ou CPF inválido",
                            content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
            })
    @PostMapping
    public ResponseEntity<ClienteResponseDTO> create(@Valid @RequestBody ClienteRequestDTO request) {
        ClienteResponseDTO cliente = clienteService.create(request);
        return ResponseEntity.created(URI.create("/api/v1/clientes/" + cliente.id())).body(cliente);
    }

    @Operation(summary = "Consultar os meus dados de cliente", responses = {
            @ApiResponse(responseCode = "200", description = "Dados do próprio cliente",
                    content = @Content(schema = @Schema(implementation = ClienteResponseDTO.class))),
            @ApiResponse(responseCode = "404", description = "O usuário ainda não possui cliente cadastrado",
                    content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
    })
    @GetMapping("/me")
    public ResponseEntity<ClienteResponseDTO> getMe() {
        return ResponseEntity.ok(clienteService.getMe());
    }

    @Operation(summary = "Consultar cliente pelo id",
            description = "Cliente consulta apenas os próprios dados. ADMIN pode consultar qualquer cliente.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Cliente encontrado",
                            content = @Content(schema = @Schema(implementation = ClienteResponseDTO.class))),
                    @ApiResponse(responseCode = "403", description = "Consulta de outro cliente não permitida",
                            content = @Content(schema = @Schema(implementation = ErrorMessage.class))),
                    @ApiResponse(responseCode = "404", description = "Cliente não encontrado",
                            content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
            })
    @GetMapping("/{id}")
    public ResponseEntity<ClienteResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(clienteService.getById(id));
    }

    @Operation(summary = "Listar todos os clientes", description = "Acesso exclusivo de ADMIN.", responses = {
            @ApiResponse(responseCode = "200", description = "Clientes cadastrados",
                    content = @Content(array = @ArraySchema(schema = @Schema(implementation = ClienteResponseDTO.class)))),
            @ApiResponse(responseCode = "403", description = "Acesso exclusivo de ADMIN",
                    content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
    })
    @GetMapping
    public ResponseEntity<List<ClienteResponseDTO>> getAll() {
        return ResponseEntity.ok(clienteService.getAll());
    }
}
