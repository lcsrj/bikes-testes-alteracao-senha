package br.edu.ifc.bikes.dto.mapper;

import br.edu.ifc.bikes.dto.ClienteRequestDTO;
import br.edu.ifc.bikes.dto.ClienteResponseDTO;
import br.edu.ifc.bikes.entity.Cliente;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface ClienteMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "usuario", ignore = true)
    Cliente toCliente(ClienteRequestDTO request);

    @Mapping(target = "usuarioId", source = "usuario.id")
    ClienteResponseDTO toResponse(Cliente cliente);

    List<ClienteResponseDTO> toResponse(List<Cliente> clientes);
}
