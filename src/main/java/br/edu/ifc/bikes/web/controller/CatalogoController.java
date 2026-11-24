package br.edu.ifc.bikes.web.controller;

import br.edu.ifc.bikes.dto.ModeloDisponivelDTO;
import br.edu.ifc.bikes.service.CatalogoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequestMapping("/api/v1/catalogo")
@RequiredArgsConstructor
@Tag(name = "Catálogo", description = "Modelos disponíveis para o cliente escolher ao alugar")
@SecurityRequirement(name = "bearerAuth")
public class CatalogoController {
    private final CatalogoService catalogo;

    @GetMapping("/modelos")
    @Operation(summary = "Consultar modelos disponíveis", description = "Requer CLIENTE autenticado. Informa apenas modelo e quantidade livre. A administração de bicicletas continua exclusiva de ADMIN.")
    public List<ModeloDisponivelDTO> modelos() { return catalogo.modelosDisponiveis(); }
}
