package br.edu.ifc.bikes.service;

import br.edu.ifc.bikes.config.JwtConfig;
import br.edu.ifc.bikes.dto.LoginRequestDTO;
import br.edu.ifc.bikes.dto.TokenResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

@Service
public class AutenticacaoService {
    private final AuthenticationManager authenticationManager;
    private final JwtEncoder encoder;
    private final Clock clock;
    private final Duration duracao;

    public AutenticacaoService(AuthenticationManager authenticationManager, JwtEncoder encoder, Clock clock,
            @Value("${bikes.jwt.duracao:PT1H}") Duration duracao) {
        if (duracao.toSeconds() < 1) throw new IllegalArgumentException("A duração do token deve ser positiva");
        this.authenticationManager = authenticationManager;
        this.encoder = encoder;
        this.clock = clock;
        this.duracao = duracao;
    }

    public TokenResponseDTO login(LoginRequestDTO request) {
        var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        Instant agora = clock.instant();
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(JwtConfig.ISSUER).subject(authentication.getName())
                .issuedAt(agora).expiresAt(agora.plus(duracao)).build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        return new TokenResponseDTO(token, "Bearer", duracao.toSeconds());
    }
}
