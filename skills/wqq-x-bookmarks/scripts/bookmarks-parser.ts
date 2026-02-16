function pickTweetId(result: any): string | null {
  const tweet = result?.tweet ?? result;
  return tweet?.legacy?.id_str ?? tweet?.rest_id ?? null;
}

function collectFromItemContent(itemContent: any, ids: Set<string>): void {
  const tweetId = pickTweetId(itemContent?.tweet_results?.result);
  if (tweetId) {
    ids.add(tweetId);
  }
}

function readBottomCursor(content: any): string | null {
  if (content?.cursorType === "Bottom" && content?.entryType === "TimelineTimelineCursor") {
    return content?.value ?? null;
  }
  if (content?.itemContent?.cursorType === "Bottom" && content?.itemContent?.itemType === "TimelineTimelineCursor") {
    return content?.itemContent?.value ?? null;
  }
  return null;
}

function walkEntry(entry: any, ids: Set<string>): string | null {
  const content = entry?.content ?? entry;
  const cursor = readBottomCursor(content);
  if (cursor) {
    return cursor;
  }

  collectFromItemContent(content?.itemContent, ids);

  const items = content?.items ?? entry?.items;
  if (Array.isArray(items)) {
    for (const item of items) {
      const itemContent = item?.item?.itemContent ?? item?.itemContent;
      const itemCursor = readBottomCursor(itemContent);
      if (itemCursor) {
        return itemCursor;
      }
      collectFromItemContent(itemContent, ids);
    }
  }

  return null;
}

export function extractBookmarkPage(payload: unknown): { tweetIds: string[]; nextCursor: string | null } {
  const instructions = (payload as any)?.data?.bookmark_timeline_v2?.timeline?.instructions;
  if (!Array.isArray(instructions)) {
    return { tweetIds: [], nextCursor: null };
  }

  const ids = new Set<string>();
  let nextCursor: string | null = null;

  for (const instruction of instructions) {
    const entries = [...(instruction?.entries ?? []), ...(instruction?.moduleItems ?? [])];
    for (const entry of entries) {
      const cursor = walkEntry(entry, ids);
      if (cursor) {
        nextCursor = cursor;
      }
    }
  }

  return { tweetIds: [...ids], nextCursor };
}
