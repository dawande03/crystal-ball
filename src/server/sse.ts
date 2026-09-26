import type { Request, Response, NextFunction } from "express";

export type SseWriter = {
  writeToken: (token: string) => void;
  writeEvent: (event: string, data: unknown) => void;
  end: () => void;
};

export function createSseWriter(res: Response): SseWriter {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  return {
    writeToken(token: string) {
      res.write(`event: token\ndata: ${JSON.stringify({ token })}\n\n`);
    },
    writeEvent(event: string, data: unknown) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    },
    end() {
      res.write(`event: done\ndata: {}\n\n`);
      res.end();
    },
  };
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
