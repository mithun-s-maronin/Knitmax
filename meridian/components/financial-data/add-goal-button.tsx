"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RecordFormDialog } from "./record-form-dialog";
import { ENTITY_CONFIGS } from "@/lib/financial-data/config";

export function AddGoalButton({
  currency,
  className,
}: {
  currency: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Button className={className} onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add goal
      </Button>
      <RecordFormDialog
        config={ENTITY_CONFIGS.goals}
        currency={currency}
        open={open}
        onOpenChange={setOpen}
        record={null}
      />
    </>
  );
}
