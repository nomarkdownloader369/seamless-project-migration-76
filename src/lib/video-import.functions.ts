import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public metadata only; requests are restricted to Cloudfam, not arbitrary URLs.
export const getCloudfamThumbnail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ embedId: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/) }).parse(input))
  .handler(async ({ data }) => {
    const { fetchCloudfamDetails } = await import("./cloudfam-thumbnail.server");
    return fetchCloudfamDetails(data.embedId);
  });