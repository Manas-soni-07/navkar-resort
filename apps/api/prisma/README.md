# ResortOS Database & Prisma Architecture

## Overview
ResortOS uses [Prisma ORM](https://www.prisma.io/) with a configuration targeted for **TiDB Cloud Serverless** (MySQL-compatible distributed SQL).

## Architecture Details
- **Provider**: `mysql`
- **Relation Mode**: `prisma` (emulates foreign key constraints in the Prisma client layer, recommended for TiDB Cloud and serverless distributed architectures).
- **Driver / Protocol**: Standard MySQL 8.0 wire protocol with TLS enabled (`sslaccept=strict`).

## Environment Configuration
Set `DATABASE_URL` in `apps/api/.env.local`:
```env
DATABASE_URL="mysql://<USERNAME>:<PASSWORD>@gateway01.<REGION>.prod.aws.tidbcloud.com:4000/resortos?sslaccept=strict"
```

## Useful Commands
- Generate client: `pnpm --filter api prisma:generate`
- Push schema to TiDB (Phase 2): `pnpm --filter api exec prisma db push`
- Prisma Studio: `pnpm --filter api exec prisma studio`

> **Note (Phase 1)**: In Phase 1, real database connectivity is intentionally deferred to avoid network dependencies or uncommitted business models.
