import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface DataTableColumn {
  key: string
  header: ReactNode
  className?: string
}

interface DataTableProps<Row> {
  columns: DataTableColumn[]
  rows: Row[]
  getRowKey: (row: Row, index: number) => string
  renderRow: (row: Row, index: number) => ReactNode
  loading?: boolean
  skeletonRows?: number
  emptyMessage: ReactNode
  colSpan?: number
}

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  renderRow,
  loading = false,
  skeletonRows = 6,
  emptyMessage,
  colSpan,
}: DataTableProps<Row>) {
  const resolvedColSpan = colSpan ?? columns.length

  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
      <table className="w-full">
        <thead className="bg-slate-900">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: skeletonRows }).map((_, index) => (
                <tr key={`table-skeleton-${index}`} className="border-b border-slate-700/50">
                  <td className="px-4 py-3" colSpan={resolvedColSpan}>
                    <div className="h-7 animate-pulse rounded bg-slate-700/60" />
                  </td>
                </tr>
              ))
            : rows.length === 0
              ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-400" colSpan={resolvedColSpan}>
                      {emptyMessage}
                    </td>
                  </tr>
                )
              : rows.map((row, index) => (
                  <tr
                    key={getRowKey(row, index)}
                    className={cn(
                      "border-b border-slate-700/50",
                      index % 2 === 0 ? "bg-slate-800" : "bg-slate-800/70",
                    )}
                  >
                    {renderRow(row, index)}
                  </tr>
                ))}
        </tbody>
      </table>
    </div>
  )
}
