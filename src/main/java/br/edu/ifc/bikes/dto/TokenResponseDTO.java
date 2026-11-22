package br.edu.ifc.bikes.dto;

public record TokenResponseDTO(String accessToken, String tokenType, long expiresIn) { }
