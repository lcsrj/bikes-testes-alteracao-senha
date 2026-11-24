package br.edu.ifc.bikes.web.controller;

import br.edu.ifc.bikes.dto.LoginRequestDTO;
import br.edu.ifc.bikes.dto.TokenResponseDTO;
import br.edu.ifc.bikes.dto.UsuarioResponseDTO;
import br.edu.ifc.bikes.security.UsuarioAtual;
import br.edu.ifc.bikes.service.AutenticacaoService;
import br.edu.ifc.bikes.web.exception.ErrorMessage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "Login e emissão de token JWT")
public class AutenticacaoController {
    private final AutenticacaoService autenticacaoService;
    private final UsuarioAtual usuarioAtual;

    @GetMapping("/me")
    @io.swagger.v3.oas.annotations.security.SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Consultar a conta autenticada")
    public UsuarioResponseDTO me() {
        var usuario = usuarioAtual.get();
        return new UsuarioResponseDTO(usuario.getId(), usuario.getUsername(), usuario.getRole().name());
    }

    @PostMapping("/login")
    @Operation(summary = "Autenticar e obter um JWT", description = "Envie o token em Authorization: Bearer <token>.")
    @ApiResponse(responseCode = "401", description = "Credenciais inválidas", content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
    @ApiResponse(responseCode = "422", description = "Campos inválidos", content = @Content(schema = @Schema(implementation = ErrorMessage.class)))
    public ResponseEntity<TokenResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(autenticacaoService.login(request));
    }
}
