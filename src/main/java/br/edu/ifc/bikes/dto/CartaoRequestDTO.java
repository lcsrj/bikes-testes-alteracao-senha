package br.edu.ifc.bikes.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import org.hibernate.validator.constraints.CreditCardNumber;

public record CartaoRequestDTO(
        @NotBlank @Size(min = 2, max = 100) @Schema(example = "Maria da Silva") String titular,
        @NotBlank @Pattern(regexp = "[0-9]{13,19}") @CreditCardNumber
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) @Schema(example = "4111111111111111") String numero,
        @NotBlank @Pattern(regexp = "[0-9]{3,4}")
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) @Schema(example = "123") String cvv,
        @NotNull @Min(1) @Max(12) @Schema(example = "12") Integer mesValidade,
        @NotNull @Min(2000) @Max(9999) @Schema(example = "2030") Integer anoValidade
) {
    @Override
    public String toString() { return "CartaoRequestDTO[dados protegidos]"; }
}
