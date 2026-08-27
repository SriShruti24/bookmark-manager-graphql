import { PrismaClient } from "@prisma/client";

export interface GraphQLContext {
  prisma: PrismaClient;
}

// Resolver Arguments
export interface FolderQueryArgs {
  id: string;
}

export interface BookmarksQueryArgs {
  folderId?: string;
  search?: string;
  take?: number;
  cursor?: string;
}

export interface CreateFolderMutationArgs {
  name: string;
}

export interface CreateBookmarkMutationArgs {
  folderId: string;
  title: string;
  url: string;
  tags?: string[];
}

export interface UpdateBookmarkMutationArgs {
  id: string;
  title?: string;
  url?: string;
  tags?: string[];
}

export interface DeleteBookmarkMutationArgs {
  id: string;
}

export interface MoveBookmarkMutationArgs {
  id: string;
  folderId: string;
}
