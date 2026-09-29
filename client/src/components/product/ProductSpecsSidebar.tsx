"use client";

import { Fragment, useState } from "react";
import { Product, SpecRow, VariantAttributes } from "@/interfaces/product";
import { Cpu, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Thông số nằm trong Variant.attributes. Ưu tiên biến thể đang chọn (khách vừa
 * bấm cấu hình nào thì bảng nhảy theo cấu hình đó), sau đó mới tới biến thể
 * đầu tiên thực sự có bảng thông số.
 */
export function getSpecAttributes(product: Product, selectedVariantId?: string | null): VariantAttributes | undefined {
  const variants = product.variants ?? [];
  const selected = selectedVariantId
    ? variants.find((v) => v.id === selectedVariantId)
    : undefined;
  if (selected && ((selected.attributes?.specsTable?.length ?? 0) > 0 || (selected.attributes?.specs?.length ?? 0) > 0)) {
    return selected.attributes;
  }
  return (
    variants.find((v) => (v.attributes?.specsTable?.length ?? 0) > 0)?.attributes ??
    variants.find((v) => (v.attributes?.specs?.length ?? 0) > 0)?.attributes ??
    variants[0]?.attributes
  );
}

export function getSpecRows(product: Product, selectedVariantId?: string | null): SpecRow[] {
  return getSpecAttributes(product, selectedVariantId)?.specsTable ?? [];
}

const SUMMARY_ROWS = 7;

function SpecRowsTable({ rows }: { rows: SpecRow[] }) {
  return (
    <table className="w-full text-left text-xs sm:text-sm">
      <tbody>
        {rows.map((row, index) => {
          const startsGroup = !!row.group && row.group !== rows[index - 1]?.group;
          return (
            <Fragment key={`${row.label}-${index}`}>
              {startsGroup && (
                <tr className="bg-primary/5">
                  <th
                    colSpan={2}
                    className="py-2 px-4 text-left text-[11px] font-bold uppercase tracking-wide text-primary"
                  >
                    {row.group}
                  </th>
                </tr>
              )}
              <tr className={`border-b border-border last:border-b-0 ${index % 2 === 1 ? "bg-muted/20" : ""}`}>
                <th className="py-2.5 px-4 font-semibold text-foreground align-top w-2/5">
                  {row.label}
                </th>
                <td className="py-2.5 px-4 text-muted-foreground whitespace-pre-line">
                  {row.value}
                </td>
              </tr>
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

export const ProductSpecsSidebar = ({ product, selectedVariantId }: { product: Product; selectedVariantId?: string | null }) => {
  const [expanded, setExpanded] = useState(false);
  const specRows = getSpecRows(product, selectedVariantId);
  const highlights = getSpecAttributes(product, selectedVariantId)?.specs ?? [];

  const visibleRows = expanded ? specRows : specRows.slice(0, SUMMARY_ROWS);

  return (
    <div className="border border-border bg-card rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-border flex items-center gap-2">
        <Cpu className="w-4 h-4 text-primary" />
        <h2 className="text-base font-bold text-foreground">Thông số kỹ thuật</h2>
      </div>

      {specRows.length > 0 ? (
        <div>
          <div className="overflow-x-auto">
            <SpecRowsTable rows={visibleRows} />
          </div>
          {specRows.length > SUMMARY_ROWS && (
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => setExpanded((v) => !v)}
                className="w-full h-9 rounded-xl text-xs font-bold text-primary hover:text-primary hover:bg-primary/10 gap-1"
              >
                {expanded ? "Thu gọn" : "Xem cấu hình chi tiết"}
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </Button>
            </div>
          )}
        </div>
      ) : highlights.length > 0 ? (
        <ul className="divide-y divide-border">
          {highlights.slice(0, SUMMARY_ROWS).map((item, index) => (
            <li key={index} className="py-2.5 px-4 text-xs sm:text-sm text-muted-foreground">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="p-4 text-xs sm:text-sm text-muted-foreground">
          Chưa có bảng thông số kỹ thuật cho sản phẩm này.
        </p>
      )}
    </div>
  );
};
