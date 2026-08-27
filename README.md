# Bookmark Manager GraphQL API

A clean, production-ready, and highly performant GraphQL API for managing bookmarks and folders. Built with Bun, TypeScript (strict mode), GraphQL Yoga, PostgreSQL, Prisma ORM, and Docker Compose.

---

## Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/) — for extremely fast startup, execution, and built-in testing.
- **Language**: [TypeScript](https://www.typescriptlang.org/) — configured in **strict mode** with zero `any` usage.
- **GraphQL Engine**: [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server) — a fully-featured, lightweight, and spec-compliant GraphQL server.
- **ORM**: [Prisma](https://www.prisma.io/) — type-safe database queries and automated migrations.
- **Database**: [PostgreSQL](https://www.postgresql.org/) — production-grade relational database running locally via [Docker Compose](https://docs.docker.com/compose/).
- **Testing**: Bun's native test runner (`bun test`) — fast execution of unit and integration tests.

---

## Project Structure

```text
bookmark-manager-graphql/
├── prisma/
│   ├── schema.prisma        # Prisma data models, relations, and indices
│   └── migrations/          # Automatically generated SQL migrations
├── src/
│   ├── graphql/
│   │   ├── schema.graphql   # Schema-first GraphQL definitions
│   │   ├── resolvers.ts     # Resolvers mapping query/mutation fields to services
│   │   └── types.ts         # TypeScript typings for GraphQL context and args
│   ├── services/
│   │   ├── folder.service.ts   # Core business logic for folders
│   │   └── bookmark.service.ts # Core business logic for bookmarks and pagination
│   ├── validation/
│   │   └── bookmark.validation.ts # Input validation functions
│   ├── lib/
│   │   └── prisma.ts        # Singleton Prisma client instance
│   └── server.ts            # Entrypoint file starting the Bun HTTP server
├── tests/
│   ├── unit/                # Service layer business logic tests
│   └── integration/         # Real PostgreSQL database integration tests
├── docker-compose.yml       # Docker Compose for PostgreSQL
├── .env.example             # Documented database configuration
├── .gitignore
├── eslint.config.js         # ESLint 9 configuration
├── package.json
└── tsconfig.json            # Strict TypeScript configuration
```

---

## Environment Variables

The project requires the following environment variables. An `.env.example` file is included:

```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bookmark_manager?schema=public"
```

---

## Setup & Running locally

Follow these steps to run the project from a fresh clone:

1. **Start PostgreSQL Container**
   ```bash
   docker compose up -d
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Run Database Migrations**
   ```bash
   bunx prisma migrate dev
   ```
   *This command creates the database tables, applies migrations, and generates the Prisma Client.*

4. **Start GraphQL Dev Server**
   ```bash
   bun run dev
   ```
   *The server will run on `http://localhost:4000/graphql`.*

---

## Database Schema & Relations

### Folder Model
- `id`: UUID (Primary Key)
- `name`: String
- `createdAt`: DateTime

### Bookmark Model
- `id`: UUID (Primary Key)
- `title`: String
- `url`: String
- `tags`: String Array (`String[]` in PostgreSQL)
- `folderId`: Foreign Key linking to `Folder(id)`
- `createdAt`: DateTime

### Constraints & Indexes
- **Cascade Deletion**: When a folder is deleted, all its associated bookmarks are automatically deleted by the database via `@relation(onDelete: Cascade)`.
- **Query Optimizations**:
  - Index on `folderId` to speed up filtering bookmarks by folder.
  - Compound index on `[createdAt, id]` to optimize cursor pagination sort and limit lookups.

---

## Pagination Design

We implement true cursor-based pagination.
- We order bookmarks by `createdAt DESC, id DESC`.
- The cursor is an opaque, Base64-encoded JSON payload containing `createdAt` and `id` (e.g. `{"createdAt":"2026-08-27T12:00:00.000Z","id":"uuid-here"}`).
- The query retrieves `take + 1` elements. If the results match `take + 1`, we set `hasNextPage = true` and construct `nextCursor` from the last record in the current page, slicing the excess record off before sending results to the client.

### How Clients Fetch Pages

#### Request Page 1
```graphql
query {
  bookmarks(take: 5) {
    nodes {
      id
      title
    }
    nextCursor
    hasNextPage
  }
}
```

#### Request Page 2
Provide the `nextCursor` returned in Request 1:
```graphql
query {
  bookmarks(take: 5, cursor: "eyJjcmVhdGVkQXQiOiIyMDI2LTA4LTI3VDE0OjI4OjQ0LjAwMFoiLCJpZCI6IjAwMDEifQ==") {
    nodes {
      id
      title
    }
    nextCursor
    hasNextPage
  }
}
```

---

## GraphQL API Operations

### Folders Query
Retrieve all folders:
```graphql
query {
  folders {
    id
    name
    createdAt
  }
}
```

### Folder Query (with Nested Bookmarks)
Retrieve a folder and its children bookmarks:
```graphql
query {
  folder(id: "FOLDER_UUID") {
    id
    name
    bookmarks {
      id
      title
      url
      tags
    }
  }
}
```

### Bookmarks Query (Filtering + Search + Pagination)
Retrieve bookmarks with optional filters:
```graphql
query {
  bookmarks(folderId: "FOLDER_UUID", search: "typescript", take: 10, cursor: "CURSOR_STRING") {
    nodes {
      id
      title
      url
      tags
      createdAt
    }
    nextCursor
    hasNextPage
  }
}
```

### Create Folder Mutation
```graphql
mutation {
  createFolder(name: "Engineering") {
    id
    name
  }
}
```

### Create Bookmark Mutation
Create a bookmark in a folder:
```graphql
mutation {
  createBookmark(
    folderId: "FOLDER_UUID"
    title: "Prisma Docs"
    url: "https://www.prisma.io/docs"
    tags: ["prisma", "orm", "database"]
  ) {
    id
    title
    url
    folder {
      name
    }
  }
}
```

### Update Bookmark Mutation
```graphql
mutation {
  updateBookmark(
    id: "BOOKMARK_UUID"
    title: "Prisma Schema Guide"
    tags: ["prisma", "schema"]
  ) {
    id
    title
    tags
  }
}
```

### Delete Bookmark Mutation
```graphql
mutation {
  deleteBookmark(id: "BOOKMARK_UUID") {
    id
    title
  }
}
```

### Move Bookmark Mutation
Move a bookmark to a different folder:
```graphql
mutation {
  moveBookmark(id: "BOOKMARK_UUID", folderId: "NEW_FOLDER_UUID") {
    id
    title
    folder {
      id
      name
    }
  }
}
```

---

## Input Validation & Error Handling

- **Bookmark Title**: Cannot be empty or contain only whitespace. Violations throw a `GraphQLError("Bookmark title cannot be empty")` with `extensions.code: "BAD_USER_INPUT"`.
- **Bookmark URL**: Validated using JavaScript's native `URL` parser. Violations throw `GraphQLError("Invalid bookmark URL")`.
- **Resource Constraints**:
  - Checking that target folder exists on Bookmark creation.
  - Checking bookmark existence before updates, deletions, and moves.
  - Checking target folder existence before moving bookmarks.
  - Missing resources throw clean `GraphQLError`s with `extensions.code: "NOT_FOUND"`.

---

## Testing

Both unit and integration tests run against a test PostgreSQL instance.

### Run Tests
```bash
bun test
```

### Run Sanity Checks
Ensure type safety, code quality, and testing compliance:
```bash
bun run sanity
```
*Runs ESLint, TypeScript compiler checks (`tsc --noEmit`), and all tests.*

---

## Future Improvements & Scalability

If this project were taken to production, the following architecture extensions would be recommended:
1. **Authentication & Authorization**: Implement JWT-based sessions or OAuth providers. Secure endpoints by injecting user context into GraphQL resolvers, ensuring folders and bookmarks are scoped per-user.
2. **Caching**: Utilize Redis to cache folder metadata and bookmark lists. Integrate standard GraphQL query response caching (e.g. `@key` or server-side cache layers).
3. **Improved Substring Search**: Replace Prisma basic `contains` queries with PostgreSQL Full-Text Search (using `tsvector` and `tsquery`) or integrate an external search engine (e.g., Elasticsearch, Meilisearch).
4. **Observability**: Set up Structured Logging (e.g., Winston/Pino) and error reporting (e.g., Sentry), and export OpenTelemetry metrics to Grafana/Prometheus.
5. **API Versioning**: Introduce schema deprecations or GraphQL gateways (like Apollo Router/Wundergraph) to manage schema versions.
6. **Docker Service Deployment**: Create a multi-stage production Dockerfile and build steps for deployability.
