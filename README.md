# S3 to S3

Aplicativo desktop para transferir arquivos e pastas entre buckets S3, com suporte a **AWS** e **Oracle Cloud Object Storage**.

Interface visual com painel duplo, drag-and-drop e fila de transferência em streaming — sem precisar baixar tudo para o disco local.

## Funcionalidades

- Painel duplo (origem e destino) com navegação por pastas e breadcrumb
- Arrastar e soltar arquivos e pastas inteiras para o destino
- Escolha da pasta destino antes de soltar (navegue até a pasta desejada)
- Menu de contexto e criação de pastas no destino
- Perfis de conexão independentes para cada provedor
- Fila de transferência paralela com progresso, retry e cancelamento
- Cópia recursiva de pastas com streaming e multipart upload
- Interface em **português (pt-BR)** e **inglês (en)**
- Credenciais criptografadas localmente com proteção do sistema operacional

## Download

Instaladores prontos para Windows, macOS e Linux estão disponíveis nas [GitHub Releases](https://github.com/millerp/s3tos3/releases).

| Plataforma | Arquivos |
|------------|----------|
| Windows | `S3 to S3 Setup x.x.x.exe` |
| macOS | `.dmg` e `-mac.zip` (Apple Silicon) |
| Linux | `.AppImage` e `.deb` |

## Requisitos

### Desenvolvimento

- Node.js 20+
- npm

### Execução

- Windows 10/11, macOS 12+ ou Linux (distribuições comuns com suporte a AppImage/deb)

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build local

```bash
# Apenas compilar (sem instalador)
npm run build:app

# Instalador por plataforma
npm run build:win
npm run build:mac
npm run build:linux
```

Os artefatos são gerados em `release/`.

## Configurar perfis

### AWS S3

1. Abra **Gerenciar perfis**
2. Crie um perfil com provedor **AWS S3**
3. Informe Access Key, Secret Key e região (ex.: `us-east-1`)
4. Clique em **Testar conexão**

### Oracle Cloud Object Storage

1. Crie um Customer Secret Key no console Oracle (Identity → Users → Customer Secret Keys)
2. Crie um perfil com provedor **Oracle Cloud**
3. Preencha:
   - **Access Key ID** e **Secret Access Key** do Customer Secret Key
   - **Região** (ex.: `sa-saopaulo-1`)
   - **Namespace** (tenancy namespace, visível no console Oracle)
4. Se a listagem automática não funcionar, preencha **Buckets manuais** (um nome por linha) ou digite o bucket diretamente na barra de conexão
5. Clique em **Testar conexão**

**Dicas Oracle:**

- Use a região OCI correta (ex.: `sa-saopaulo-1`, não `sa-east-1`)
- O **namespace** é o tenancy namespace (Administration → Tenancy details)
- A API S3 da Oracle só lista buckets do compartimento raiz ou do compartimento configurado para API S3
- O AWS SDK v3 exige checksums desabilitados para Oracle — o app já configura isso automaticamente

O endpoint Oracle é montado automaticamente:

```
https://{namespace}.compat.objectstorage.{region}.oraclecloud.com
```

## Como transferir

1. Selecione o perfil e bucket na coluna **Origem**
2. Selecione o perfil e bucket na coluna **Destino**
3. Navegue na coluna destino até a pasta onde deseja copiar
4. Arraste um arquivo ou pasta da origem e solte na área destino (ou sobre uma subpasta)
5. Confirme a transferência no diálogo

## Segurança

- Credenciais ficam em `%APPDATA%/s3tos3/data/profiles.json` (Windows) ou equivalente em `userData` no macOS/Linux
- **Access Key** e **Secret Key** são criptografadas em repouso:
  - **Windows/macOS:** `safeStorage` do Electron (DPAPI / Keychain)
  - **Linux sem libsecret:** fallback AES-256-GCM com chave derivada do perfil local do app
- Perfis antigos em texto plano são migrados automaticamente na primeira leitura
- A Secret Key nunca é exposta ao processo de renderização (UI)
- Nunca compartilhe ou versione arquivos de perfil — não funcionam em outro computador
- Transferências entre provedores diferentes passam pelo app em streaming (não há cópia server-side cross-cloud)

## CI/CD e releases

O projeto usa [semantic-release](https://github.com/semantic-release/semantic-release) com [Conventional Commits](https://www.conventionalcommits.org/):

| Tipo de commit | Release |
|----------------|---------|
| `feat:` | versão minor (ex.: 1.2.0) |
| `fix:`, `perf:`, `refactor:` | versão patch (ex.: 1.1.2) |
| `chore:`, `ci:`, `docs:` | sem release automático |

Fluxo em push na branch `master`:

1. **semantic-release** — bump de versão, `CHANGELOG.md`, tag e GitHub Release
2. **Build** — Windows, macOS e Linux
3. **Publish** — upload dos instaladores ao release

Release manual (sem bump de versão): Actions → **Release** → **Run workflow** → marcar `force: true`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o app em modo desenvolvimento |
| `npm run build:app` | Compila sem gerar instalador |
| `npm run build` | Compila e gera instalador Windows |
| `npm run build:win` | Instalador Windows |
| `npm run build:mac` | Instalador macOS |
| `npm run build:linux` | Instalador Linux (AppImage + deb) |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm run semantic-release` | Release local (requer `GITHUB_TOKEN`) |

## Licença

MIT
