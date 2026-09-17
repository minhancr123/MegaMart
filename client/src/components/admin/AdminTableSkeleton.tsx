import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";

interface AdminTableSkeletonProps {
  /** Số cột của bảng đang render. */
  columns: number;
  /** Số dòng skeleton, mặc định 5. */
  rows?: number;
}

/**
 * Skeleton dòng bảng cho admin. Đặt trực tiếp bên trong <TableBody>.
 */
export function AdminTableSkeleton({ columns, rows = 5 }: AdminTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={rowIndex} className="animate-pulse">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <TableCell key={colIndex}>
              <Skeleton className="h-5 w-full bg-muted/60" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
