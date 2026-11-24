# Bikes

Sistema acadêmico de locação de bicicletas com API e interface web em português. Atende clientes que desejam alugar e devolver bicicletas e administradores responsáveis pela frota e pelos cadastros.

O cliente cria uma conta, entra, cadastra nome e CPF e solicita uma locação. Pode consultar apenas seus dados e suas locações. O administrador consulta usuários, clientes e relatórios, cadastra bicicletas e altera sua disponibilidade. A devolução pode liberar a bicicleta ou encaminhá-la à manutenção.

A interface usa os mesmos dados e permissões da API. O cartão serve apenas à simulação acadêmica; nenhum pagamento é processado. Não existem edição de cadastro de cliente, exclusão de recursos, cancelamento de locação nem promoção de administrador pela interface porque a API não oferece essas operações.

A aplicação é servida pelo Spring Boot, sem serviço de frontend separado. O contrato dos recursos está no README e nos controllers. Valores e fuso horário vêm da configuração do servidor. O acesso principal é pelo navegador em computador ou celular.

A apresentação pública usa uma demonstração estática no GitHub Pages, com dados fictícios e os mesmos fluxos visuais. Os visitantes escolhem o perfil de cliente ou administrador, podem alterar os exemplos e restaurá-los. Cada navegador mantém sua própria base local. Essa versão não executa a API Java, não exige MySQL e simula o acesso apenas para apresentação. O build de Pages ativa esse modo explicitamente; a interface servida pelo Spring Boot continua conectada à API.
