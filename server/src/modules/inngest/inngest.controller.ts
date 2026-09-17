import { All, Controller, Req, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { serve } from 'inngest/express';
import type { Request, Response } from 'express';
import { inngest } from './inngest.client';
import { InngestRegistryService } from './inngest-registry.service';

/**
 * Endpoint duy nhất cho Inngest: GET/POST/PUT /api/inngest
 * (global prefix 'api' + controller path 'inngest').
 *
 * - @SkipThrottle: global ThrottlerGuard (3 req/s) sẽ 429 các lần sync/poll
 *   của Inngest dev server nếu không bỏ qua.
 * - Passthrough req/res nguyên bản cho `serve()` (SDK tự đọc req.body đã parse).
 * - Trỏ CLI dev: npx inngest-cli dev -u http://localhost:3001/api/inngest
 */
@SkipThrottle()
@Controller('inngest')
export class InngestController {
  private handler: ReturnType<typeof serve> | null = null;

  constructor(private readonly registry: InngestRegistryService) {}

  @All()
  handle(@Req() req: Request, @Res() res: Response): unknown {
    if (!this.handler) {
      this.handler = serve({
        client: inngest,
        functions: this.registry.getFunctions(),
      });
    }
    return (this.handler as (req: Request, res: Response) => unknown)(req, res);
  }
}
