import { GraphQLError } from "graphql";

/**
 * Validates and trims a bookmark title.
 * Throws a GraphQLError if the title is empty or only contains whitespace.
 */
export function validateAndTrimTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed === "") {
    throw new GraphQLError("Bookmark title cannot be empty", {
      extensions: { code: "BAD_USER_INPUT" }
    });
  }
  return trimmed;
}

/**
 * Validates and trims a bookmark URL.
 * Throws a GraphQLError if the URL is invalid.
 */
export function validateAndTrimUrl(url: string): string {
  const trimmed = url.trim();
  try {
    new URL(trimmed);
  } catch (error) {
    throw new GraphQLError("Invalid bookmark URL", {
      extensions: { code: "BAD_USER_INPUT" }
    });
  }
  return trimmed;
}

/**
 * Validates and trims a folder name.
 * Throws a GraphQLError if the folder name is empty.
 */
export function validateAndTrimFolderName(name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") {
    throw new GraphQLError("Folder name cannot be empty", {
      extensions: { code: "BAD_USER_INPUT" }
    });
  }
  return trimmed;
}
