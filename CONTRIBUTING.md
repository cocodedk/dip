# Bidrag til dip / Prøveklar

Brug Node.js 24 og npm; grænsefladen forbliver dansk.

```sh
git clone https://github.com/cocodedk/dip.git
cd dip
npm ci
./scripts/install-hooks.sh
npm run dev
```

## Kontrol

```sh
npm run lint
npm test           # kræver præcis 22 beståede tests
npm run build      # omfatter projektets TypeScript-kontrol
```

`pre-commit` kører lint; `pre-push` kører tests og produktionsbygning, kræver en GitHub-destination under `cocodedk` og afviser sletning eller ændring af historik på beskyttede grene.
Hooks aktiveres pr. klon med installationsscriptet; de følger ikke automatisk med Git-konfigurationen.
`--no-verify` kan omgå lokale hooks, og GitHub-websiden, CI og overførsler af repository bruger dem ikke; serverens beskyttelse af `main` er derfor nødvendig.

Opret en PR fra en gren i kebab-case med præfikset `feature/`, `fix/`, `chore/`, `docs/`, `refactor/` eller `ci/`; brug Conventional Commits som `fix: ret prøveresultat` (valgfrit scope og `!` understøttes).
Arbejd via PR frem for direkte commits til `main`.

## Lokal Git-konfiguration

```sh
git config pull.rebase true
git config core.autocrlf input
git config push.autoSetupRemote true
git config init.defaultBranch main
```

På Windows kan `core.autocrlf true` bruges.
Efter første grønne CI på `main` kan administratoren køre `./scripts/setup-repo.sh`; det kræver godkendt `gh` med administratoradgang til `cocodedk/dip`.

## Projektregler

React/TypeScript, StyleX og lokal lagring; tilføj ikke en server uden et konkret behov.
Bevar oprindelige prøvedatoer og officielle facitlinks; historiske nyheder er arkivstof.
Begge grænser gælder: 36/45 i alt og 4/5 værdispørgsmål; oprindelige prøver med 40 spørgsmål bruger 32/40.
Knapper og WebMCP bruger samme `Controller`; hvert view registrerer sine værktøjer, og `src/tool-info.ts` genererer `/llms.txt`.
Browserbevis skal bruge rigtig Chromes WebMCP-værktøjer; Playwright åbner sider og tager screenshots.
Se [README](README.md#webmcp-and-proof) for kommandoerne, og opdatér dokumentation ved adfærdsændringer.

Original kode er Apache-2.0; officielle spørgsmål og materialer er undtaget, og deres videredistributionsrettigheder er uafklarede, se [NOTICE](NOTICE) og [rettighedsnotatet](i/reuse-rights.md).
Medtag aldrig hemmeligheder, intern sessionshukommelse eller personlige eksportfiler i en PR.
