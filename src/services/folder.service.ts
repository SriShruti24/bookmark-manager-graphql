import { prisma } from "../lib/prisma.ts";
import { validateAndTrimFolderName } from "../validation/bookmark.validation.ts";
import { GraphQLError } from "graphql";

export interface FolderWithBookmarks {
  id: string;
  name: string;
  createdAt: Date;
  bookmarks?: Array<{
    id: string;
    title: string;
    url: string;
    tags: string[];
    folderId: string;
    createdAt: Date;
  }>;
}

export class FolderService {
  /**
   * Returns all folders in the database.
   */
  static async getFolders() {
    return prisma.folder.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  /**
   * Returns a folder by its ID, with its bookmarks.
   * If the folder does not exist, returns null (or we can throw if required,
   * but returning null allows GraphQL resolver to return null or throw depending on standard).
   * Let's throw a clear error if the folder is queried specifically and not found.
   */
  static async getFolderById(id: string) {
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        bookmarks: {
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });

    if (!folder) {
      throw new GraphQLError(`Folder with ID "${id}" not found`, {
        extensions: { code: "NOT_FOUND" }
      });
    }

    return folder;
  }

  /**
   * Creates a new folder.
   * Validates the input name.
   */
  static async createFolder(name: string) {
    const validatedName = validateAndTrimFolderName(name);
    return prisma.folder.create({
      data: {
        name: validatedName
      }
    });
  }
}
