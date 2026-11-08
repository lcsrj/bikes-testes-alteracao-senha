package br.edu.ifc.bikes.service;

import br.edu.ifc.bikes.dto.UsuarioRequestDTO;
import br.edu.ifc.bikes.dto.UsuarioResponseDTO;
import br.edu.ifc.bikes.dto.UsuarioSenhaDTO;
import br.edu.ifc.bikes.dto.mapper.UsuarioMapper;
import br.edu.ifc.bikes.entity.Usuario;
import br.edu.ifc.bikes.exception.EntityNotFoundException;
import br.edu.ifc.bikes.exception.PasswordInvalidException;
import br.edu.ifc.bikes.exception.UsernameUniqueViolationException;
import br.edu.ifc.bikes.repository.UsuarioRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@RequiredArgsConstructor
@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final UsuarioMapper usuarioMapper;
    private final PasswordEncoder passwordEncoder;

    public UsuarioResponseDTO create(UsuarioRequestDTO usuarioRequestDTO) {
        try {
            Usuario usuario = usuarioMapper.toUsuario(usuarioRequestDTO);
            usuario.setPassword(passwordEncoder.encode(usuarioRequestDTO.password()));
            return usuarioMapper.toResponse(usuarioRepository.saveAndFlush(usuario));
        }catch (DataIntegrityViolationException ex){

            throw new UsernameUniqueViolationException(String.format("O nome do usuário '%s' já existe", usuarioRequestDTO.username()));
        }
    }

    @Transactional()
    @PreAuthorize("@usuarioAtual.isAdminOuProprio(#id)")
    public UsuarioResponseDTO getById(Long id) {
        return usuarioMapper.toResponse(usuarioRepository.findById(id).orElseThrow(
                ()->new EntityNotFoundException(String.format("Usuário com id=%d não encontrado", id))
        ));
    }

    @Transactional
    @PreAuthorize("@usuarioAtual.isAdminOuProprio(#id)")
    public void updatePassword(Long id, UsuarioSenhaDTO senha) {
        Usuario usuario = usuarioRepository.findById(id).orElseThrow(
                () -> new EntityNotFoundException(String.format("Usuário com id=%d não encontrado", id)));
        if (!passwordEncoder.matches(senha.senhaAtual(), usuario.getPassword())) {
            throw new PasswordInvalidException("A senha atual não confere");
        }
        if (!senha.novaSenha().equals(senha.confirmaSenha())) {
            throw new PasswordInvalidException("A nova senha e a confirmação não conferem");
        }
        usuario.setPassword(passwordEncoder.encode(senha.novaSenha()));
        usuarioRepository.save(usuario);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<UsuarioResponseDTO> getAll(){
        return usuarioMapper.toResponse(usuarioRepository.findAll());
    }
}
