"use client";

import type { ReactElement } from "react";
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
}: {
  trigger: ReactElement;
  pending: boolean;
  onFinish: (generateFeedback: boolean) => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
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
}
