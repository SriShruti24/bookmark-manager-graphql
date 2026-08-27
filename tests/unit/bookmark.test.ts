import { describe, expect, it, beforeEach } from "bun:test";
import { FolderService } from "../../src/services/folder.service.ts";
import { BookmarkService } from "../../src/services/bookmark.service.ts";
import { prisma } from "../../src/lib/prisma.ts";

async function truncateDb() {
  await prisma.bookmark.deleteMany({});
  await prisma.folder.deleteMany({});
}

describe("Folder & Bookmark Services (Unit)", () => {
  beforeEach(async () => {
    await truncateDb();
  });

  describe("FolderService", () => {
    it("should create a folder successfully", async () => {
      const folder = await FolderService.createFolder("Tech");
      expect(folder).toBeDefined();
      expect(folder.name).toBe("Tech");

      const folders = await FolderService.getFolders();
      expect(folders.length).toBe(1);
      expect(folders[0].name).toBe("Tech");
    });

    it("should reject folder with empty name", async () => {
      expect(FolderService.createFolder("")).rejects.toThrow("Folder name cannot be empty");
      expect(FolderService.createFolder("   ")).rejects.toThrow("Folder name cannot be empty");
    });

    it("should retrieve a single folder with its bookmarks", async () => {
      const folder = await FolderService.createFolder("Design");
      const bookmark = await BookmarkService.createBookmark({
        folderId: folder.id,
        title: "Figma",
        url: "https://figma.com",
        tags: ["design", "ui"]
      });

      const retrieved = await FolderService.getFolderById(folder.id);
      expect(retrieved).toBeDefined();
      expect(retrieved.id).toBe(folder.id);
      expect(retrieved.bookmarks).toBeDefined();
      expect(retrieved.bookmarks!.length).toBe(1);
      expect(retrieved.bookmarks![0].id).toBe(bookmark.id);
    });

    it("should throw error if folder ID does not exist", async () => {
      expect(FolderService.getFolderById("non-existent-id")).rejects.toThrow('Folder with ID "non-existent-id" not found');
    });
  });

  describe("BookmarkService", () => {
    it("should create, update, delete, and move bookmarks", async () => {
      // Setup folders
      const devFolder = await FolderService.createFolder("Dev");
      const readFolder = await FolderService.createFolder("Read Later");

      // 1. Create Bookmark
      const bookmark = await BookmarkService.createBookmark({
        folderId: devFolder.id,
        title: "Bun Shell",
        url: "https://bun.sh",
        tags: ["bun", "typescript"]
      });
      expect(bookmark).toBeDefined();
      expect(bookmark.title).toBe("Bun Shell");
      expect(bookmark.url).toBe("https://bun.sh");
      expect(bookmark.tags).toEqual(["bun", "typescript"]);

      // 2. Update Bookmark
      const updated = await BookmarkService.updateBookmark(bookmark.id, {
        title: "Bun Runtime",
        tags: ["bun", "js"]
      });
      expect(updated.title).toBe("Bun Runtime");
      expect(updated.url).toBe("https://bun.sh"); // unchanged
      expect(updated.tags).toEqual(["bun", "js"]);

      // 3. Move Bookmark
      const moved = await BookmarkService.moveBookmark(bookmark.id, readFolder.id);
      expect(moved.folderId).toBe(readFolder.id);

      // Verify folder contents
      const devRetrieved = await FolderService.getFolderById(devFolder.id);
      expect(devRetrieved.bookmarks!.length).toBe(0);

      const readRetrieved = await FolderService.getFolderById(readFolder.id);
      expect(readRetrieved.bookmarks!.length).toBe(1);
      expect(readRetrieved.bookmarks![0].id).toBe(bookmark.id);

      // 4. Delete Bookmark
      await BookmarkService.deleteBookmark(bookmark.id);
      const readRetrievedAfter = await FolderService.getFolderById(readFolder.id);
      expect(readRetrievedAfter.bookmarks!.length).toBe(0);
    });

    it("should validate bookmark title and url on create", async () => {
      const folder = await FolderService.createFolder("Test");

      // Reject empty or whitespace-only title
      expect(
        BookmarkService.createBookmark({
          folderId: folder.id,
          title: "",
          url: "https://example.com"
        })
      ).rejects.toThrow("Bookmark title cannot be empty");

      expect(
        BookmarkService.createBookmark({
          folderId: folder.id,
          title: "    ",
          url: "https://example.com"
        })
      ).rejects.toThrow("Bookmark title cannot be empty");

      // Reject invalid URL
      expect(
        BookmarkService.createBookmark({
          folderId: folder.id,
          title: "Invalid URL Test",
          url: "not-a-url"
        })
      ).rejects.toThrow("Invalid bookmark URL");
    });

    it("should support filter by folder and search by title substring", async () => {
      const folderA = await FolderService.createFolder("Folder A");
      const folderB = await FolderService.createFolder("Folder B");

      await BookmarkService.createBookmark({
        folderId: folderA.id,
        title: "TypeScript Deep Dive",
        url: "https://basarat.gitbook.io"
      });

      await BookmarkService.createBookmark({
        folderId: folderA.id,
        title: "JavaScript Basics",
        url: "https://javascript.info"
      });

      await BookmarkService.createBookmark({
        folderId: folderB.id,
        title: "Rust Book",
        url: "https://rust-lang.org"
      });

      // Filter by folderA
      const resA = await BookmarkService.getBookmarks({ folderId: folderA.id });
      expect(resA.nodes.length).toBe(2);

      // Substring search (case insensitive)
      const resSearch = await BookmarkService.getBookmarks({ search: "script" });
      expect(resSearch.nodes.length).toBe(2); // "TypeScript Deep Dive" and "JavaScript Basics"

      const resSearchCaps = await BookmarkService.getBookmarks({ search: "TYPESCRIPT" });
      expect(resSearchCaps.nodes.length).toBe(1);
      expect(resSearchCaps.nodes[0].title).toBe("TypeScript Deep Dive");
    });

    it("should support cursor pagination correctly across multiple pages", async () => {
      const folder = await FolderService.createFolder("Pagination Test");

      // Create 12 bookmarks
      const created = [];
      for (let i = 1; i <= 12; i++) {
        // Sleep slightly to guarantee different createdAt timestamps
        await new Promise((resolve) => setTimeout(resolve, 5));
        const bookmark = await BookmarkService.createBookmark({
          folderId: folder.id,
          title: `Bookmark ${i}`,
          url: `https://example.com/${i}`
        });
        created.push(bookmark);
      }

      // We expect bookmarks are sorted newest first (descending by createdAt)
      const expectedOrdering = [...created].reverse();

      // Page 1: take 5
      const page1 = await BookmarkService.getBookmarks({
        folderId: folder.id,
        take: 5
      });
      expect(page1.nodes.length).toBe(5);
      expect(page1.hasNextPage).toBe(true);
      expect(page1.nextCursor).not.toBeNull();
      // Assert the contents are the first 5 of the reversed list
      expect(page1.nodes.map(n => n.title)).toEqual(
        expectedOrdering.slice(0, 5).map(n => n.title)
      );

      // Page 2: take 5, using page1.nextCursor
      const page2 = await BookmarkService.getBookmarks({
        folderId: folder.id,
        take: 5,
        cursor: page1.nextCursor!
      });
      expect(page2.nodes.length).toBe(5);
      expect(page2.hasNextPage).toBe(true);
      expect(page2.nextCursor).not.toBeNull();
      expect(page2.nodes.map(n => n.title)).toEqual(
        expectedOrdering.slice(5, 10).map(n => n.title)
      );

      // Page 3: take 5, using page2.nextCursor
      const page3 = await BookmarkService.getBookmarks({
        folderId: folder.id,
        take: 5,
        cursor: page2.nextCursor!
      });
      expect(page3.nodes.length).toBe(2); // remaining 2 bookmarks
      expect(page3.hasNextPage).toBe(false);
      expect(page3.nextCursor).toBeNull();
      expect(page3.nodes.map(n => n.title)).toEqual(
        expectedOrdering.slice(10, 12).map(n => n.title)
      );

      // Verify no duplicates or skipped records across all pages
      const allTitles = [
        ...page1.nodes.map(n => n.title),
        ...page2.nodes.map(n => n.title),
        ...page3.nodes.map(n => n.title)
      ];
      expect(allTitles.length).toBe(12);
      expect(new Set(allTitles).size).toBe(12);
    });
  });
});
