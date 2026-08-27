import { describe, expect, it, beforeEach } from "bun:test";
import { prisma } from "../../src/lib/prisma.ts";

describe("PostgreSQL Database Integration Tests", () => {
  beforeEach(async () => {
    // Clear data to ensure a clean slate
    await prisma.bookmark.deleteMany({});
    await prisma.folder.deleteMany({});
  });

  it("should connect, execute database writes and reads, and enforce constraints", async () => {
    // 1. Create a Folder directly via Prisma Client
    const dbFolder = await prisma.folder.create({
      data: {
        name: "Integration Test Folder"
      }
    });
    expect(dbFolder).toBeDefined();
    expect(dbFolder.id).toBeDefined();
    expect(dbFolder.name).toBe("Integration Test Folder");

    // 2. Create a Bookmark directly via Prisma Client
    const dbBookmark = await prisma.bookmark.create({
      data: {
        folderId: dbFolder.id,
        title: "Integration Test Bookmark",
        url: "https://integration-test.com",
        tags: ["integration", "postgres", "prisma"]
      }
    });
    expect(dbBookmark).toBeDefined();
    expect(dbBookmark.id).toBeDefined();
    expect(dbBookmark.title).toBe("Integration Test Bookmark");
    expect(dbBookmark.url).toBe("https://integration-test.com");
    expect(dbBookmark.tags).toEqual(["integration", "postgres", "prisma"]);

    // 3. Query bookmarks from PostgreSQL and assert returned data
    const queryBookmark = await prisma.bookmark.findUnique({
      where: { id: dbBookmark.id },
      include: { folder: true }
    });

    expect(queryBookmark).not.toBeNull();
    expect(queryBookmark!.title).toBe("Integration Test Bookmark");
    expect(queryBookmark!.folder.name).toBe("Integration Test Folder");

    // 4. Test database constraints: Delete Folder and check that Cascade deletes the Bookmarks
    await prisma.folder.delete({
      where: { id: dbFolder.id }
    });

    const queryBookmarkAfterDelete = await prisma.bookmark.findUnique({
      where: { id: dbBookmark.id }
    });
    expect(queryBookmarkAfterDelete).toBeNull();
  });
});
