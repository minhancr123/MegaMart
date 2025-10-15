"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatPrice = formatPrice;
exports.formatPriceVND = formatPriceVND;
exports.parsePrice = parsePrice;
exports.validatePrice = validatePrice;
exports.calculateVAT = calculateVAT;
function formatPrice(price) {
    return Number(price);
}
function formatPriceVND(price) {
    const numPrice = typeof price === 'bigint' ? Number(price) : price;
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(numPrice);
}
function parsePrice(price) {
    if (price < 0) {
        throw new Error('Price cannot be negative');
    }
    return BigInt(Math.round(price));
}
function validatePrice(price) {
    if (typeof price !== 'number' || isNaN(price)) {
        throw new Error('Price must be a valid number');
    }
    if (price < 0) {
        throw new Error('Price cannot be negative');
    }
    if (price > 999999999999) {
        throw new Error('Price exceeds maximum limit');
    }
    return true;
}
function calculateVAT(price, vatPercent = 10) {
    const numPrice = typeof price === 'bigint' ? Number(price) : price;
    return BigInt(Math.round(numPrice * vatPercent / 100));
}
//# sourceMappingURL=price.util.js.map