import { FolderService } from "../services/folder.service.ts";
import { BookmarkService } from "../services/bookmark.service.ts";
import { prisma } from "../lib/prisma.ts";
import {
  FolderQueryArgs,
  BookmarksQueryArgs,
  CreateFolderMutationArgs,
  CreateBookmarkMutationArgs,
  UpdateBookmarkMutationArgs,
  DeleteBookmarkMutationArgs,
  MoveBookmarkMutationArgs
} from "./types.ts";

export const resolvers = {
  Query: {
    folders: async () => {
      return FolderService.getFolders();
    },
    folder: async (_parent: unknown, args: FolderQueryArgs) => {
      return FolderService.getFolderById(args.id);
    },
    bookmarks: async (_parent: unknown, args: BookmarksQueryArgs) => {
      return BookmarkService.getBookmarks(args);
    }
  },

  Mutation: {
    createFolder: async (_parent: unknown, args: CreateFolderMutationArgs) => {
      return FolderService.createFolder(args.name);
    },
    createBookmark: async (_parent: unknown, args: CreateBookmarkMutationArgs) => {
      return BookmarkService.createBookmark(args);
    },
    updateBookmark: async (_parent: unknown, args: UpdateBookmarkMutationArgs) => {
      const { id, ...data } = args;
      return BookmarkService.updateBookmark(id, data);
    },
    deleteBookmark: async (_parent: unknown, args: DeleteBookmarkMutationArgs) => {
      return BookmarkService.deleteBookmark(args.id);
    },
    moveBookmark: async (_parent: unknown, args: MoveBookmarkMutationArgs) => {
      return BookmarkService.moveBookmark(args.id, args.folderId);
    }
  },

  Folder: {
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
    bookmarks: async (parent: { id: string }) => {
      return prisma.bookmark.findMany({
        where: { folderId: parent.id },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" }
        ]
      });
    }
  },

  Bookmark: {
    createdAt: (parent: { createdAt: Date }) => parent.createdAt.toISOString(),
    folder: async (parent: { folderId: string }) => {
      const folder = await prisma.folder.findUnique({
        where: { id: parent.folderId }
      });
      return folder;
    }
  }
};
