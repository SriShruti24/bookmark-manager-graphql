import { createYoga } from "graphql-yoga";
import { resolvers } from "./graphql/resolvers.ts";
import { prisma } from "./lib/prisma.ts";

// Read GraphQL Schema using Bun API
const typeDefs = await Bun.file("./src/graphql/schema.graphql").text();

const yoga = createYoga({
  schema: {
    typeDefs,
    resolvers
  },
  context: () => ({
    prisma
  })
});

const server = Bun.serve({
  port: 4000,
  fetch: (request) => yoga.fetch(request)
});

console.log(`🚀 Server is running on http://${server.hostname}:${server.port}/graphql`);
