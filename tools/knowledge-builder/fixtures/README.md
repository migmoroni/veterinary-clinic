# Fixtures

As fixtures são autocontidas e exercitam contratos do compilador sem copiar o
catálogo canônico:

- `valid-minimal/`: fonte mínima que passa por validação e projeção;
- `valid-markdown/`: CommonMark permitido e formas semanticamente equivalentes;
- `valid-media/`: perfil fixo das fontes e do thumbnail JPEG;
- `invalid-schema/`: forma JSON recusada pelo schema executável;
- `invalid-markdown/`: nós AST e links proibidos;
- `invalid-media/`: caminhos e propriedades de mídia inválidos;
- `contexts/`: contextos de build local e de release pública.

Os testes que precisam de bytes PNG, JPEG com orientação EXIF, GIF e WebP os
geram deterministicamente em diretórios temporários. Esses bytes são dados de
teste, não uma segunda fonte de conhecimento.
