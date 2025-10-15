export declare function formatPrice(price: bigint): number;
export declare function formatPriceVND(price: number | bigint): string;
export declare function parsePrice(price: number): bigint;
export declare function validatePrice(price: number): boolean;
export declare function calculateVAT(price: number | bigint, vatPercent?: number): bigint;
