# Fixtures

As fixtures são autocontidas e exercitam contratos do compilador sem copiar o
catálogo canônico:

- `valid-minimal/`: fonte mínima que passa por validação e projeção, formada por
  uma localidade e pelas 13 taxonomias canônicas com termos mínimos nos seis
  locales;
- `valid-markdown/`: CommonMark permitido e formas semanticamente equivalentes;
- `valid-media/`: perfil fixo das fontes e do thumbnail JPEG;
- `invalid-schema/`: forma JSON recusada pelo schema executável;
- `invalid-markdown/`: nós AST e links proibidos;
- `invalid-media/`: caminhos e propriedades de mídia inválidos;
- `contexts/`: contextos de build local e de release pública.

Os testes que precisam de bytes PNG, JPEG com orientação EXIF, GIF e WebP os
geram deterministicamente em diretórios temporários. Esses bytes são dados de
teste, não uma segunda fonte de conhecimento.

`registry.json` é o registro executável das fixtures. O teste de cobertura exige
correspondência exata entre seus casos e os diretórios acima e executa uma
asserção positiva ou negativa para cada caso. Limites de bytes e dimensões,
assinatura/extensão, orientação, transparência, ausência de ampliação e
adulterações de artefatos usam dados temporários para não manter binários
redundantes no repositório.

Os testes integrais também adulteram isoladamente colunas escalares e JSON,
valor, normalização, proveniência e ordem de busca, label e aliases de
taxonomias, termo, taxonomia, tipo da entidade e ordem da relação universal,
ausência de taxonomia canônica, proprietário taxonômico duplicado, ausência de
associação obrigatória, tabelas físicas indevidas, protocolos, conteúdo
compilado e referências estruturais. A matriz temporária de mídia usa dois
ativos e dois objetos CAS válidos para alterar hash, MIME, tamanho, dimensões e thumbnail de
`system_media`, incluindo isoladamente o `thumbnail_mime_type`. Tamanhos e
checksums externos são recalculados antes da reutilização, que ainda precisa
recusar cada divergência em relação ao contrato tipado.
