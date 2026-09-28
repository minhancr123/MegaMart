/**
 * Cache kết quả method trong bộ nhớ với TTL.
 * Analytics đọc nặng nhưng không cần realtime tuyệt đối: cache 60s giúp
 * dashboard tải lại / F5 nhiều lần không nện DB liên tục, và giảm sốc khi
 * Prisma Accelerate cold-start (nguyên nhân gây timeout 10s phía client).
 */
export function Cacheable(ttlMs: number, keyPrefix: string) {
  const cache = new Map<string, { exp: number; data: any }>();

  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const original = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const key =
        `${keyPrefix}:` +
        args
          .map((a) =>
            a instanceof Date
              ? a.toISOString()
              : a === undefined || a === null
                ? ""
                : String(a),
          )
          .join("|");
      const now = Date.now();
      const hit = cache.get(key);
      if (hit && hit.exp > now) return hit.data;

      const data = await original.apply(this, args);
      // Chống phình bộ nhớ: dọn key hết hạn khi quá nhiều key
      if (cache.size > 500) {
        for (const [k, v] of cache) {
          if (v.exp <= now) cache.delete(k);
        }
      }
      cache.set(key, { exp: now + ttlMs, data });
      return data;
    };
    return descriptor;
  };
}
