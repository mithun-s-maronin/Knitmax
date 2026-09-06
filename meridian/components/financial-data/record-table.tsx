"use client";

import * as React from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteRecord } from "@/lib/actions/records";
import { formatCurrency } from "@/lib/format";
import type { EntityConfig } from "@/lib/financial-data/config";
import { RecordFormDialog } from "./record-form-dialog";

type Row = Record<string, unknown>;

const str = (value: unknown) => (typeof value === "string" ? value : "");

/**
 * The list view for one record type: search, filter, sort, edit, delete and a
 * running total.
 *
 * Deletion goes through a confirmation dialog that names the record, because
 * it is the one destructive action on this screen and an accidental one is not
 * recoverable (§49).
 */
export function RecordTable({
  config,
  rows,
  currency,
  filterLabels,
}: {
  config: EntityConfig;
  rows: Row[];
  currency: string;
  /** Human labels for the filter field's values. */
  filterLabels?: Record<string, string>;
}) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<string | null>(null);
  const [sort, setSort] = React.useState<{ key: string; desc: boolean } | null>(null);
  const [editing, setEditing] = React.useState<Row | null | undefined>(undefined);
  const [deleting, setDeleting] = React.useState<Row | null>(null);
  const [pending, startTransition] = React.useTransition();

  const filterValues = React.useMemo(() => {
    if (!config.filterField) return [];
    const seen = new Set<string>();
    for (const row of rows) {
      const value = str(row[config.filterField]);
      if (value) seen.add(value);
    }
    return [...seen].sort();
  }, [rows, config.filterField]);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    let result = rows.filter((row) => {
      if (
        filter &&
        config.filterField &&
        str(row[config.filterField]) !== filter
      ) {
        return false;
      }
      if (!needle) return true;
      return [row.name, row.notes, row.description]
        .filter((v): v is string => typeof v === "string")
        .some((v) => v.toLowerCase().includes(needle));
    });

    if (sort) {
      const column = config.columns.find((c) => c.key === sort.key);
      const valueOf =
        column?.sortValue ?? ((row: Row) => str(row[sort.key]).toLowerCase());
      result = [...result].sort((a, b) => {
        const av = valueOf(a);
        const bv = valueOf(b);
        const order = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.desc ? -order : order;
      });
    }

    return result;
  }, [rows, query, filter, sort, config]);

  const total = config.total?.(visible) ?? null;

  const confirmDelete = () => {
    if (!deleting) return;
    const name = str(deleting.name) || `this ${config.singular}`;

    startTransition(async () => {
      const result = await deleteRecord({
        table: config.table,
        id: String(deleting.id),
      });
      setDeleting(null);
      if (result.ok) toast.success(`Deleted ${name}.`);
      else toast.error(result.error ?? "We could not delete that.");
    });
  };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${config.plural.toLowerCase()}`}
            aria-label={`Search ${config.plural.toLowerCase()}`}
            className="pl-9"
          />
        </div>

        <Button className="sm:ml-auto" onClick={() => setEditing(null)}>
          <Plus className="size-4" />
          {config.addLabel}
        </Button>
      </div>

      {filterValues.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter">
          <FilterChip active={filter === null} onClick={() => setFilter(null)}>
            All
          </FilterChip>
          {filterValues.map((value) => (
            <FilterChip
              key={value}
              active={filter === value}
              onClick={() => setFilter(filter === value ? null : value)}
            >
              {filterLabels?.[value] ?? value.replace(/_/g, " ")}
            </FilterChip>
          ))}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          icon={Plus}
          title={config.emptyTitle}
          description={config.emptyDescription}
          action={
            <Button className="mt-2" onClick={() => setEditing(null)}>
              {config.addLabel}
            </Button>
          }
          className="mt-5"
        />
      ) : visible.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nothing matches that search.
        </p>
      ) : (
        <div className="surface mt-5 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                {config.columns.map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      column.align === "right" && "text-right",
                      column.secondary && "hidden sm:table-cell",
                    )}
                    aria-sort={
                      sort?.key === column.key
                        ? sort.desc
                          ? "descending"
                          : "ascending"
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSort((current) =>
                          current?.key === column.key
                            ? { key: column.key, desc: !current.desc }
                            : { key: column.key, desc: false },
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-1 rounded uppercase tracking-wide transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        column.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {column.label}
                      {sort?.key === column.key ? (
                        sort.desc ? (
                          <ArrowDown className="size-3" />
                        ) : (
                          <ArrowUp className="size-3" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  </TableHead>
                ))}
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {visible.map((row) => (
                <TableRow key={String(row.id)}>
                  {config.columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(
                        column.align === "right" && "text-right",
                        column.secondary && "hidden sm:table-cell",
                      )}
                    >
                      {column.render(row, currency)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${str(row.name)}`}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setEditing(row)}>
                          <Pencil className="size-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => setDeleting(row)}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

            {total ? (
              <TableFooter>
                <TableRow>
                  <TableCell
                    colSpan={config.columns.length - 1}
                    className="hidden sm:table-cell"
                  >
                    {total.label}
                  </TableCell>
                  <TableCell colSpan={1} className="sm:hidden">
                    {total.label}
                  </TableCell>
                  <TableCell className="text-right tabular">
                    {formatCurrency(total.value, currency)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            ) : null}
          </Table>
        </div>
      )}

      {visible.length > 0 && visible.length !== rows.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {visible.length} of {rows.length}
        </p>
      ) : null}

      <RecordFormDialog
        config={config}
        currency={currency}
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
        record={editing ?? null}
      />

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete “{str(deleting?.name) || `this ${config.singular}`}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This removes the record permanently and recalculates your live
              figures. Assessments you have already completed are not affected —
              they keep the numbers they were scored with.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmDelete();
              }}
              disabled={pending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {pending ? "Deleting" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}
