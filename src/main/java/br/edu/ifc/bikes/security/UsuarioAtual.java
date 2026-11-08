package br.edu.ifc.bikes.security;

import br.edu.ifc.bikes.entity.Usuario;
import br.edu.ifc.bikes.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UsuarioAtual {

    private final UsuarioRepository usuarioRepository;

    public Usuario get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            throw new AuthenticationCredentialsNotFoundException("Autenticação obrigatória");
        }
        return usuarioRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AuthenticationCredentialsNotFoundException("Usuário não encontrado"));
    }

    public boolean isAdminOuProprio(Long usuarioId) {
        Usuario usuario = get();
        return usuario.getRole() == Usuario.Role.ADMIN || usuario.getId().equals(usuarioId);
    }
}
