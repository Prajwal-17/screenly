"use client";

import type { ReactElement } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function FinishInterviewDialog({
  trigger,
  pending,
  onFinish,
  tooltip,
}: {
  trigger: ReactElement;
  pending: boolean;
  onFinish: (generateFeedback: boolean) => void;
  tooltip?: string;
}) {
  const dialog = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {tooltip ? <TooltipTrigger asChild>{trigger}</TooltipTrigger> : trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Finish interview?</AlertDialogTitle>
          <AlertDialogDescription>
            Your conversation will be saved. Choose whether to generate
            feedback. Wait for your last answer to appear in the conversation
            before finishing.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:flex-col-reverse">
          <AlertDialogCancel>Keep going</AlertDialogCancel>
          <AlertDialogAction
            variant="outline"
            disabled={pending}
            onClick={() => onFinish(false)}
          >
            End without feedback
          </AlertDialogAction>
          <AlertDialogAction disabled={pending} onClick={() => onFinish(true)}>
            Finish and view feedback
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
  return tooltip ? (
    <Tooltip>
      {dialog}
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  ) : (
    dialog
  );
}
