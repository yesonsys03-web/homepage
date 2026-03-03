import { useMemo, useState } from "react"
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

type AdminTableProps<TData extends object> = {
  data: TData[]
  columns: Array<ColumnDef<TData>>
  loading: boolean
  loadingMessage: string
  emptyMessage: string
  initialPageSize?: number
}

export function AdminTable<TData extends object>({
  data,
  columns,
  loading,
  loadingMessage,
  emptyMessage,
  initialPageSize = 20,
}: AdminTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [pageIndex, setPageIndex] = useState(0)

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination: {
        pageIndex,
        pageSize: initialPageSize,
      },
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function"
        ? updater({ pageIndex, pageSize: initialPageSize })
        : updater
      setPageIndex(next.pageIndex)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const totalRows = data.length
  const pageRows = table.getRowModel().rows
  const pageCount = table.getPageCount()
  const canPrev = table.getCanPreviousPage()
  const canNext = table.getCanNextPage()

  const headerGroups = useMemo(() => table.getHeaderGroups(), [table])

  return (
    <Card className="bg-[#161F42] border-0">
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6 text-[#B8C3E6]">{loadingMessage}</div>
        ) : totalRows === 0 ? (
          <div className="p-6 text-[#B8C3E6]">{emptyMessage}</div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                {headerGroups.map((group) => (
                  <tr key={group.id} className="border-b border-[#111936]">
                    {group.headers.map((header) => {
                      const canSort = header.column.getCanSort()
                      const sortState = header.column.getIsSorted()
                      return (
                        <th
                          key={header.id}
                          className="text-left p-4 text-[#B8C3E6] font-medium"
                        >
                          {header.isPlaceholder ? null : (
                            <button
                              type="button"
                              className={canSort ? "inline-flex items-center gap-1 hover:text-[#F4F7FF]" : "inline-flex"}
                              onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                              disabled={!canSort}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {sortState === "asc" ? " ▲" : sortState === "desc" ? " ▼" : ""}
                            </button>
                          )}
                        </th>
                      )
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#111936]/50 hover:bg-[#111936]/30">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-4 align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {pageCount > 1 ? (
              <div className="flex items-center justify-between border-t border-[#111936] p-4">
                <p className="text-xs text-[#B8C3E6]">
                  총 {totalRows}건 | 페이지 {pageIndex + 1} / {Math.max(1, pageCount)}
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                    disabled={!canPrev}
                    onClick={() => table.previousPage()}
                  >
                    이전
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-[#111936] text-[#B8C3E6] hover:bg-[#111936]"
                    disabled={!canNext}
                    onClick={() => table.nextPage()}
                  >
                    다음
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
