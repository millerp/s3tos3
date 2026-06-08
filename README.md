# S3 to S3

Aplicativo desktop para transferir arquivos e pastas entre buckets S3, com suporte a **AWS** e **Oracle Cloud Object Storage**.

## Funcionalidades

- Painel duplo (origem e destino) com navegação por pastas
- Arrastar e soltar arquivos e pastas inteiras para o destino
- Escolha da pasta destino antes de soltar (navegue até a pasta desejada)
- Perfis de conexão independentes para cada provedor
- Fila de transferência com progresso e cancelamento
- Cópia recursiva de pastas com streaming (sem baixar tudo para disco)

## Requisitos

- Node.js 20+
- Windows 10/11 (build configurado para Windows)

## Desenvolvimento

```bash
npm install
npm run dev
```

## Build (instalador Windows)

```bash
npm run build
```

O instalador será gerado em `release/`.

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

- Credenciais ficam armazenadas localmente em `%APPDATA%/s3tos3/data/profiles.json` (sem criptografia na v1)
- Nunca compartilhe ou versione arquivos de perfil
- A transferência entre provedores diferentes passa pelo app em streaming (não há cópia server-side cross-cloud)

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o app em modo desenvolvimento |
| `npm run build:app` | Compila sem gerar instalador |
| `npm run build` | Compila e gera instalador Windows |
| `npm run typecheck` | Verifica tipos TypeScript |
