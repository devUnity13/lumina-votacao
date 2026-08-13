# LUMINA — Plataforma de votação

MVP de votação para evento de modelos, com carrossel individual, confirmação de voto, painel de cadastro e upload de fotos.

## Rodar localmente

1. Instale as dependências com `pnpm install`.
2. Copie `.env.example` para `.env.local` e preencha os valores.
3. No Supabase, execute `supabase/schema.sql` no SQL Editor.
4. No Supabase Storage, crie um bucket público chamado `modelos`, limite de 4 MB e tipos JPG, PNG e WebP.
5. Rode `pnpm dev` e acesse `http://localhost:3000`.

Sem as variáveis do Supabase, o projeto usa os arquivos de `data/` apenas para desenvolvimento local. Em produção, as variáveis são obrigatórias.

## Variáveis

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SECRET_KEY=sb_secret_sua_chave
ADMIN_PASSWORD=uma-senha-forte
VOTE_SALT=uma-frase-aleatoria-longa
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Nunca publique `.env.local` nem exponha `SUPABASE_SECRET_KEY` no navegador ou no GitHub.

## Publicar na Vercel

1. Envie o projeto para um repositório no GitHub.
2. Importe o repositório em **New Project** na Vercel.
3. Adicione as cinco variáveis em **Environment Variables**.
4. Faça o deploy.
5. Troque `NEXT_PUBLIC_SITE_URL` pela URL final da Vercel e faça um redeploy.

## Voto único

O MVP combina identificador do navegador e assinatura de rede/dispositivo com uma restrição única no banco. Links com `?convite=TOKEN` usam o token como identificador único, preparando a futura automação do Instagram. Identificação anônima não garante literalmente uma pessoa em aparelhos diferentes; para essa garantia, use convites individuais ou autenticação.

## Painel

Acesse `/admin`, informe `ADMIN_PASSWORD`, preencha os dados da modelo e selecione várias fotos. Cada foto pode ter até 4 MB.
