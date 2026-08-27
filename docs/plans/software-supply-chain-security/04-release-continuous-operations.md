# Fase 4 — release verificável e operação contínua

## Estado e dependência

Proposto. Executar somente após a conclusão e validação de
`03-runtime-network-protection.md`; também depende dos artefatos e evidências
produzidos por `02-project-build-integration.md`.

O protocolo canônico permanece em `../software-supply-chain-security-plan.md`.
Esta fase não recompila nem altera dependências: autentica o resultado aprovado,
publica-o e mantém as fontes temporais e procedimentos de segurança atualizados.

## Objetivo

Fazer com que cada release seja verificável por identidade, hashes, SBOM,
vulnerabilidades, policy, proveniência e assinatura, e manter o protocolo ativo
por verificações periódicas e resposta reproduzível a incidentes.

## Fora de escopo

- reimplementar o gate, o build ou o boundary de runtime;
- permitir assinatura local ou cache local como autoridade de release;
- atualizar dependências automaticamente em resposta a advisory;
- guardar chaves de assinatura dentro do guard ou do repositório;
- implementar nesta fase o futuro orquestrador Rails.

O futuro Hub Server/Rails consome o mesmo comando canônico e as mesmas
evidências; ele não cria uma segunda policy nem uma segunda implementação.

## Contrato de release

Cada release deve ligar por digest:

- artefato, commit/snapshot, lockfiles, policy e bundle de dependências;
- digest/versão do Supply Chain Guard utilizado;
- CycloneDX do produto e inventário separado da plataforma de build;
- in-toto VULNS, VEX quando aplicável e SVR;
- SLSA Provenance v1 coletada pelo control plane;
- policy de rede e conjunto de capabilities incluídos;
- assinatura do artefato e envelopes autenticados.

A etapa assinante recebe o artefato pronto da fase 2, revalida subjects/digests e
não possui compilador, resolvedor de dependências ou permissão para recompilar.
Identidade, raiz de confiança e verifier são allowlisted e rotacionáveis.

## CI/release e autoridade

1. Criar job de release isolado, com workload identity e permissões mínimas.
2. Rejeitar cache, relatório ou evidência provenientes do checkout/PR.
3. Verificar versão de schema, subject, signer, issuer, audience e raiz antes de
   promover qualquer evidência.
4. Assinar artefato e envelopes sem expor chave estática ao build.
5. Publicar somente o conjunto atômico de artefato, assinatura e evidências.
6. Manter retenção, imutabilidade e possibilidade de revogação conforme policy.
7. Impedir promoção quando qualquer entrada estiver ausente, expirada,
   `denied` ou `indeterminate`.

## Operação contínua

Automatizar `security:scheduled` com as cadências canônicas:

- semanal: advisories, IOCs, integridade das fontes, expiração e deltas;
- mensal: inventário completo, toolchains, licenses, publishers, policies,
  exceções, network intents e deriva de configuração;
- trimestral: exercício de incidente, restauração/verificação de evidências,
  rotação/revisão de confiança e teste de isolamento.

Mudança em fonte temporal reexecuta somente o matching e as decisões afetadas
quando os fingerprints preservados continuarem válidos. Otimização nunca reduz a
cobertura nem transforma falha de fonte em aprovação.

## Resposta a incidentes

O comando `security:incident` recebe IOC externo, produz relatório reproduzível
e bloqueia a baseline quando necessário. O procedimento deve:

1. localizar o indicador em manifests, lockfiles, grafo, cache, SBOM e releases;
2. distinguir presença, alcançabilidade, execução no build e inclusão no
   artefato;
3. preservar evidências e registrar decisão humana;
4. orientar invalidação seletiva, correção controlada, novo build isolado e nova
   assinatura;
5. revogar ou sinalizar releases atingidas pelos mecanismos previstos.

O incidente nunca altera manifests/lockfiles, baixa correção jovem, cria exceção
ou apaga caches automaticamente. Advisories críticos alertam e podem bloquear a
versão atual, mas não eliminam o cooldown de 72 horas da correção.

## Sequência de execução

1. Fechar schemas e subjects das evidências entregues pelas fases anteriores.
2. Implementar geração e verificação de SBOM, VULNS, VEX, SVR e Provenance.
3. Implantar identidade, assinatura, armazenamento e promoção protegidos.
4. Conectar `security:release` ao conjunto atômico verificável.
5. Configurar jobs semanais e revisão mensal.
6. Documentar e executar o primeiro exercício trimestral de incidente.
7. Validar revogação, restauração e verificação independente das evidências.

## Estratégia de testes

- evidência com subject, signer, issuer, audience ou schema divergente é rejeitada;
- artefato alterado depois do build não pode ser assinado/promovido;
- job assinante não recompila e não acessa resolvedores de dependência;
- CI rejeita evidência local, cache poisoning e envelope forjado;
- SBOM inclui dependências transitivas/de build e distingue plataforma/produto;
- VEX não elimina achado sem justificativa e vínculo verificável;
- fonte temporal nova invalida somente decisões realmente dependentes;
- falha/expiração de advisory ou IOC resulta em `indeterminate`, não aprovação;
- exercício de incidente localiza pacote por versão, origem e checksum;
- advisory crítico não gera update nem exceção automática;
- restauração preserva assinatura, subjects e histórico de revogação.

## Critérios de aceite

- Cada release possui SBOM, hashes, assinatura e proveniência autenticável.
- Evidências ligam artefato, snapshot, lockfiles, policy, guard e runtime por
  digests verificáveis.
- Build e assinatura possuem identidades, permissões e ambientes separados.
- Nenhum output local ou originado de PR possui autoridade de promoção.
- Verificações semanais, mensais e trimestrais têm responsáveis e resultados
  rastreáveis.
- Incidentes são reproduzíveis e não causam mutações automáticas perigosas.
- Falha, expiração ou incerteza bloqueia promoção sem criar bypass.
- O futuro Rails pode orquestrar os contratos sem duplicar sua lógica.

Depois dos testes específicos, executar a skill `$validate-workspace` como gate
geral final da implementação completa. O plano só pode ser considerado concluído
depois de apresentar esse resultado e tratar seus checkpoints com o usuário.

