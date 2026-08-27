# Fase 3 — proteção de rede em runtime

## Estado e dependência

Proposto. Executar somente após a conclusão e validação de
`02-project-build-integration.md`.

O protocolo canônico permanece em `../software-supply-chain-security-plan.md`.
Esta fase trata exclusivamente do comportamento de rede do aplicativo já
compilado; não altera o motor genérico do guard nem a aquisição de dependências.

## Objetivo

Transformar todo acesso externo legítimo do veterinary-clinic em uma intenção
tipada, validável e observável, com allowlists mínimas por scheme, host, path,
método, redirects, plataforma e classificação dos dados.

A policy deve impedir que código da aplicação introduza primitives genéricas de
rede ou abertura de URLs, sem misturar essa fiscalização ao bundle final do
guard.

## Fora de escopo

- alterar a policy de cooldown ou o pipeline de aquisição/build da fase 2;
- implementar firewall corporativo ou política de toda a estação;
- assinar, publicar ou monitorar releases, tratados na fase 4;
- registrar payloads, dados clínicos ou PII para fins de auditoria.

## Catálogo e boundary de rede

1. Preencher `security/network-policy.json` com intents, scheme, host, path,
   método, limite, redirect, classificação de dados e plataformas.
2. Criar gateway outbound por intenção e migrar ViaCEP, WhatsApp, e-mail e
   telefone; não expor `request(url)`/`openExternalUrl(url)` genéricos.
3. Remover o `fetch(source)` genérico de imagens e aceitar somente assets locais
   aprovados por hash e tamanho.
4. Validar destinos antes de DNS/redirect e revalidar cada salto permitido.
5. Definir limites de tamanho, timeout, método, headers e conteúdo por intenção.
6. Recusar scheme, host, porta, credenciais embutidas, IP literal ou path não
   declarado.

## Tauri, WebView e sandbox

1. Ativar CSP restritiva e allowlist exata de `connect-src`.
2. Substituir `shell:allow-open` por opener/command com scopes exatos.
3. Reduzir capabilities Tauri ao mínimo por janela/plataforma.
4. Revisar `--share=network` do Flatpak e equivalentes por plataforma.
5. Proibir primitives outbound fora dos módulos autorizados por análise e testes
   do guard, mantendo explícito que contenção forte de Rust nativo depende do
   sandbox do processo.
6. Garantir que nenhuma permissão de desenvolvimento seja herdada pelo pacote de
   produção.

## Privacidade e observabilidade

Logs registram somente intenção, resultado, classe de erro, duração e destino
normalizado quando permitido. Eles não contêm payload, telefone, e-mail, query,
token, credencial, identificador clínico ou outro dado pessoal.

Falhas de policy devem ser distinguíveis de indisponibilidade externa sem
revelar detalhes sensíveis na interface ou nos logs.

## Sequência de execução

1. Inventariar todas as primitives e destinos atuais por target/plataforma.
2. Definir e revisar o schema de `network-policy.json`.
3. Implementar gateway tipado e migrar cada integração legítima.
4. Remover APIs genéricas substituídas no mesmo escopo.
5. Restringir CSP, Tauri capabilities, opener e sandbox de plataforma.
6. Conectar análise estática e testes do boundary ao `security:gate`.
7. Validar privacidade dos logs e comportamento offline.

Cada integração só é considerada migrada quando a primitive anterior é removida
e destinos semelhantes ou redirects não declarados são recusados.

## Estratégia de testes

- inventário acusa qualquer `fetch`, socket, opener ou shell fora do boundary;
- gateway recusa hosts, schemes, portas e paths apenas parecidos aos permitidos;
- redirects são bloqueados ou revalidados salto a salto;
- limites de método, tamanho, timeout e conteúdo são aplicados por intenção;
- CSP e Tauri scopes permitem somente as capacidades declaradas;
- assets remotos ou sem hash/tamanho aprovado são recusados;
- build de produção não contém permissões exclusivas de desenvolvimento;
- logs e erros não contêm PII, payload, query, token ou dados clínicos;
- modo offline falha de forma explícita e segura, sem fallback externo.

## Critérios de aceite

- Todo acesso externo legítimo passa pelo gateway de intenções.
- Não resta API genérica de URL/rede acessível ao código comum da aplicação.
- `security/network-policy.json` é a fonte canônica, validada pelo gate.
- CSP, Tauri capabilities e sandbox correspondem à policy por plataforma.
- Destinos e redirects não autorizados falham antes de transmitir dados.
- Logs operacionais não expõem PII nem conteúdo clínico.
- O guard continua fora do bundle e apenas valida os contratos dessa fase.

Depois dos testes específicos, executar a skill `$validate-workspace` como gate
geral final da fase. Somente um resultado aprovado permite iniciar a fase 4.

## Entrega para a fase 4

A fase termina entregando a policy de rede versionada, o boundary tipado, os
scopes de plataforma e os testes necessários para que uma release possa atestar
também as restrições de runtime que contém.

