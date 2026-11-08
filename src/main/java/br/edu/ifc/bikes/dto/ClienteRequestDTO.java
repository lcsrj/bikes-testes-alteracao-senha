package br.edu.ifc.bikes.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.hibernate.validator.constraints.br.CPF;

@Schema(description = "Cadastro do cliente vinculado automaticamente ao usuário autenticado")
public record ClienteRequestDTO(
        @NotBlank(message = "O nome é obrigatório")
        @Size(min = 2, max = 100, message = "O nome deve ter entre 2 e 100 caracteres")
        @Schema(example = "Maria da Silva")
        String nome,

        @NotBlank(message = "O CPF é obrigatório")
        @Pattern(regexp = "[0-9]{11}", message = "O CPF deve conter exatamente 11 dígitos, sem pontuação")
        @CPF(message = "O CPF deve ser válido")
        @Schema(example = "52998224725", description = "CPF válido, único e sem pontuação")
        String cpf
) {
    public ClienteRequestDTO {
        if (nome != null) nome = nome.strip();
    }
}
