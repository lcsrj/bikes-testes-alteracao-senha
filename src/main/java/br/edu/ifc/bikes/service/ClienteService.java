package br.edu.ifc.bikes.service;

import br.edu.ifc.bikes.dto.ClienteRequestDTO;
import br.edu.ifc.bikes.dto.ClienteResponseDTO;
import br.edu.ifc.bikes.dto.mapper.ClienteMapper;
import br.edu.ifc.bikes.entity.Cliente;
import br.edu.ifc.bikes.entity.Usuario;
import br.edu.ifc.bikes.exception.ClienteUniqueViolationException;
import br.edu.ifc.bikes.exception.EntityNotFoundException;
import br.edu.ifc.bikes.repository.ClienteRepository;
import br.edu.ifc.bikes.security.UsuarioAtual;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Transactional(readOnly = true)
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final ClienteMapper clienteMapper;
    private final UsuarioAtual usuarioAtual;

    @Transactional
    public ClienteResponseDTO create(ClienteRequestDTO request) {
        Usuario usuario = usuarioAtual.get();
        if (clienteRepository.existsByUsuarioId(usuario.getId())) {
            throw new ClienteUniqueViolationException("O usuário já possui um cliente cadastrado");
        }
        if (clienteRepository.existsByCpf(request.cpf())) {
            throw new ClienteUniqueViolationException("O CPF já está cadastrado");
        }
        Cliente cliente = clienteMapper.toCliente(request);
        cliente.setUsuario(usuario);
        try {
            return clienteMapper.toResponse(clienteRepository.saveAndFlush(cliente));
        } catch (DataIntegrityViolationException ex) {
            // As restrições do banco também garantem unicidade em cadastros concorrentes.
            throw new ClienteUniqueViolationException("CPF ou usuário já cadastrado");
        }
    }

    public ClienteResponseDTO getMe() {
        return clienteMapper.toResponse(clienteRepository.findByUsuarioId(usuarioAtual.get().getId())
                .orElseThrow(() -> new EntityNotFoundException("Cliente não cadastrado para o usuário autenticado")));
    }

    public ClienteResponseDTO getById(Long id) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException(String.format("Cliente com id=%d não encontrado", id)));
        Usuario usuario = usuarioAtual.get();
        if (usuario.getRole() != Usuario.Role.ADMIN && !cliente.getUsuario().getId().equals(usuario.getId())) {
            throw new AccessDeniedException("O cliente só pode consultar os seus próprios dados");
        }
        return clienteMapper.toResponse(cliente);
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<ClienteResponseDTO> getAll() {
        return clienteMapper.toResponse(clienteRepository.findAll());
    }
}
