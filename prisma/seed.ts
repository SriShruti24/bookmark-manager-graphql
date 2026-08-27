import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning database...");
  await prisma.bookmark.deleteMany({});
  await prisma.folder.deleteMany({});

  console.log("Seeding folders...");
  const devFolder = await prisma.folder.create({
    data: { name: "Development" }
  });
  const learnFolder = await prisma.folder.create({
    data: { name: "Learning" }
  });
  const resFolder = await prisma.folder.create({
    data: { name: "Resources" }
  });

  console.log("Seeding bookmarks...");
  // Learning folder bookmarks
  await prisma.bookmark.create({
    data: {
      folderId: learnFolder.id,
      title: "TypeScript Handbook",
      url: "https://www.typescriptlang.org/docs/handbook/intro.html",
      tags: ["typescript", "lang", "docs"]
    }
  });
  await prisma.bookmark.create({
    data: {
      folderId: learnFolder.id,
      title: "GraphQL Documentation",
      url: "https://graphql.org/learn/",
      tags: ["graphql", "api", "docs"]
    }
  });

  // Resources folder bookmarks
  await prisma.bookmark.create({
    data: {
      folderId: resFolder.id,
      title: "Prisma Documentation",
      url: "https://www.prisma.io/docs",
      tags: ["prisma", "orm", "database"]
    }
  });
  await prisma.bookmark.create({
    data: {
      folderId: resFolder.id,
      title: "Bun Documentation",
      url: "https://bun.sh/docs",
      tags: ["bun", "runtime", "docs"]
    }
  });

  // Development folder bookmarks (total 6 to show pagination)
  const devBookmarks = [
    { title: "React Documentation", url: "https://react.dev", tags: ["react", "frontend", "docs"] },
    { title: "Vite Guide", url: "https://vitejs.dev/guide/", tags: ["vite", "bundler"] },
    { title: "Tailwind CSS", url: "https://tailwindcss.com/docs", tags: ["css", "styling"] },
    { title: "Next.js Docs", url: "https://nextjs.org/docs", tags: ["nextjs", "react", "framework"] },
    { title: "Node.js API", url: "https://nodejs.org/api/", tags: ["nodejs", "backend"] },
    { title: "MDN Web Docs", url: "https://developer.mozilla.org", tags: ["html", "css", "js", "web"] }
  ];

  for (const bm of devBookmarks) {
    // Add brief delays to ensure descending timestamps are distinct
    await new Promise((resolve) => setTimeout(resolve, 5));
    await prisma.bookmark.create({
      data: {
        folderId: devFolder.id,
        ...bm
      }
    });
  }

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
