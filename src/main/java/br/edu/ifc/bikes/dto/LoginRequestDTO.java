package br.edu.ifc.bikes.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequestDTO(@NotBlank @Email String username, @NotBlank @Size(min = 6, max = 6) String password) {
    @Override
    public String toString() { return "LoginRequestDTO[credenciais protegidas]"; }
}
