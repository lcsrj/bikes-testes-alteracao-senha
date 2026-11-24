"""Validate text in PDFs produced by browser tests (requires pypdf 7.1.1)."""
from pathlib import Path
import re
from pypdf import PdfReader


def read(name):
    reader = PdfReader(Path('target/pdf-e2e') / name)
    assert not reader.is_encrypted
    for index, page in enumerate(reader.pages, 1):
        assert f'Página {index} de {len(reader.pages)}' in page.extract_text()
    return reader, '\n'.join(page.extract_text() for page in reader.pages)


reader, full = read('relatorio-completo.pdf')
normalized = re.sub(r'\s+', ' ', full)
assert len(reader.pages) >= 5
for expected in ['Locações e devoluções', 'Devolução prevista', 'Clientes', 'Auditoria',
                 'Frota atual', 'Contas de acesso', 'DEMONSTRAÇÃO', 'Elétrica City',
                 'Manutenção', 'Lara Martins', 'Rafael Costa', 'Beatriz Lima',
                 'admin@bikes.demo', 'cliente@bikes.demo', 'Em andamento', 'Finalizada',
                 'Cartão final: 1111', 'America/Sao_Paulo']:
    assert expected in normalized, expected
for number in range(1, 9):
    assert f'#{number}\n' in full, f'Locação ausente: {number}'
    assert f'BIKE-{number:03d}' in full
assert '4111111111111111' not in full
assert 'passwordHash' not in full
assert 'eyJ' not in full

_, mobile = read('relatorio-mobile.pdf')
assert 'Contas de acesso' in mobile and 'BIKE-008' in mobile
many, long = read('multipagina.pdf')
assert len(many.pages) > len(reader.pages)
for number in range(1000, 1065):
    assert f'#{number}\n' in long, f'Locação ausente: {number}'
assert long.count('João Antônio da Conceição') == 65
assert long.count('Locação / cliente') >= 2, 'Cabeçalho não repetido'
_, empty = read('vazio.pdf')
assert empty.count('Nenhum registro nesta categoria.') == 4

api = Path('target/ui-e2e/relatorio-api.pdf')
if api.exists():
    content = '\n'.join(p.extract_text() for p in PdfReader(api).pages)
    assert 'jose@gmail.com' in content
    assert 'DEMONSTRAÇÃO' not in content
    assert 'Contas de acesso' in content
print('PDFs validados: conteúdo completo, acentos, paginação, base vazia e dados privados.')
