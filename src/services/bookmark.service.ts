import { prisma } from "../lib/prisma.ts";
import { validateAndTrimTitle, validateAndTrimUrl } from "../validation/bookmark.validation.ts";
import { GraphQLError } from "graphql";

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  tags: string[];
  folderId: string;
  createdAt: Date;
}

export interface BookmarkConnection {
  nodes: Bookmark[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface GetBookmarksOptions {
  folderId?: string;
  search?: string;
  take?: number;
  cursor?: string;
}

/**
 * Encodes a database row's unique ordering fields into a base64 cursor string.
 */
export function serializeCursor(createdAt: Date, id: string): string {
  const payload = {
    createdAt: createdAt.toISOString(),
    id
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

/**
 * Decodes a base64 cursor string back into ordering fields.
 */
export function deserializeCursor(cursorStr: string): { createdAt: Date; id: string } {
  try {
    const jsonStr = Buffer.from(cursorStr, "base64").toString("ascii");
    const payload = JSON.parse(jsonStr);
    if (!payload.createdAt || !payload.id) {
      throw new Error();
    }
    return {
      createdAt: new Date(payload.createdAt),
      id: payload.id
    };
  } catch (err) {
    throw new GraphQLError("Invalid cursor format", {
      extensions: { code: "BAD_USER_INPUT" }
    });
  }
}

export class BookmarkService {
  /**
   * Retrieves paginated bookmarks with optional folder and title filters.
   */
  static async getBookmarks(options: GetBookmarksOptions): Promise<BookmarkConnection> {
    const { folderId, search, cursor } = options;
    const limit = options.take !== undefined ? Math.max(1, options.take) : 20;

    // Build query conditions
    const where: any = {};

    if (folderId) {
      where.folderId = folderId;
    }

    if (search && search.trim() !== "") {
      where.title = {
        contains: search.trim(),
        mode: "insensitive"
      };
    }

    if (cursor) {
      const decoded = deserializeCursor(cursor);
      where.OR = [
        {
          createdAt: {
            lt: decoded.createdAt
          }
        },
        {
          createdAt: decoded.createdAt,
          id: {
            lt: decoded.id
          }
        }
      ];
    }

    // Fetch limit + 1 to check if there is a next page
    const bookmarks = await prisma.bookmark.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" }
      ],
      take: limit + 1
    });

    const hasNextPage = bookmarks.length > limit;
    const nodes = hasNextPage ? bookmarks.slice(0, limit) : bookmarks;

    let nextCursor: string | null = null;
    if (hasNextPage && nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      nextCursor = serializeCursor(lastNode.createdAt, lastNode.id);
    }

    return {
      nodes,
      nextCursor,
      hasNextPage
    };
  }

  /**
   * Creates a new bookmark inside a folder.
   */
  static async createBookmark(data: { folderId: string; title: string; url: string; tags?: string[] }) {
    const folderExists = await prisma.folder.findUnique({
      where: { id: data.folderId }
    });

    if (!folderExists) {
      throw new GraphQLError(`Folder with ID "${data.folderId}" not found`, {
        extensions: { code: "NOT_FOUND" }
      });
    }

    const title = validateAndTrimTitle(data.title);
    const url = validateAndTrimUrl(data.url);
    const tags = data.tags || [];

    return prisma.bookmark.create({
      data: {
        title,
        url,
        tags,
        folderId: data.folderId
      }
    });
  }

  /**
   * Updates bookmark fields (partial update).
   */
  static async updateBookmark(id: string, data: { title?: string; url?: string; tags?: string[] }) {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id }
    });

    if (!bookmark) {
      throw new GraphQLError(`Bookmark with ID "${id}" not found`, {
        extensions: { code: "NOT_FOUND" }
      });
    }

    const updateData: any = {};

    if (data.title !== undefined) {
      updateData.title = validateAndTrimTitle(data.title);
    }

    if (data.url !== undefined) {
      updateData.url = validateAndTrimUrl(data.url);
    }

    if (data.tags !== undefined) {
      updateData.tags = data.tags;
    }

    return prisma.bookmark.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Deletes a bookmark.
   */
  static async deleteBookmark(id: string) {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id }
    });

    if (!bookmark) {
      throw new GraphQLError(`Bookmark with ID "${id}" not found`, {
        extensions: { code: "NOT_FOUND" }
      });
    }

    return prisma.bookmark.delete({
      where: { id }
    });
  }

  /**
   * Moves a bookmark to a new folder.
   */
  static async moveBookmark(id: string, folderId: string) {
    const bookmark = await prisma.bookmark.findUnique({
      where: { id }
    });

    if (!bookmark) {
      throw new GraphQLError(`Bookmark with ID "${id}" not found`, {
        extensions: { code: "NOT_FOUND" }
      });
    }

    const folderExists = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!folderExists) {
      throw new GraphQLError(`Destination folder with ID "${folderId}" not found`, {
        extensions: { code: "NOT_FOUND" }
      });
    }

    return prisma.bookmark.update({
      where: { id },
      data: { folderId }
    });
  }
}
