import { Injectable } from "@nestjs/common";
import type { InngestFunction } from "inngest";

/**
 * Registry gom mọi Inngest function để serve qua 1 endpoint duy nhất.
 * Mỗi job tự đăng ký trong constructor → controller luôn thấy đủ functions.
 */
@Injectable()
export class InngestRegistryService {
  private readonly functions: InngestFunction.Any[] = [];

  register(fn: InngestFunction.Any): void {
    this.functions.push(fn);
  }

  getFunctions(): InngestFunction.Any[] {
    return this.functions;
  }
}
