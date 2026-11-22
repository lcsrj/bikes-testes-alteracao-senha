package br.edu.ifc.bikes.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Email;
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
        String cpf,
        @Pattern(regexp = "[0-9+() -]{8,20}", message = "O telefone deve ter entre 8 e 20 caracteres válidos")
        @Schema(example = "(49) 99999-9999", description = "Contato opcional") String telefone,
        @Email @Size(max = 100) @Schema(example = "maria@example.com", description = "E-mail de contato opcional") String email
) {
    public ClienteRequestDTO(String nome, String cpf) { this(nome, cpf, null, null); }

    public ClienteRequestDTO {
        if (nome != null) nome = nome.strip();
        if (telefone != null) telefone = telefone.strip();
        if (email != null) email = email.strip();
    }
}
