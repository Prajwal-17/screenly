import type { Dialog, Page } from "@playwright/test";

// For intentional full-document reloads and test cleanup, accept only the native
// exit warning. In-app exit confirmations remain explicit test interactions.
export async function acceptDocumentExit<T>(
  page: Page,
  action: () => Promise<T>,
) {
  const accept = (dialog: Dialog) => {
    if (dialog.type() === "beforeunload") void dialog.accept();
    else void dialog.dismiss();
  };
  page.on("dialog", accept);
  try {
    return await action();
  } finally {
    page.off("dialog", accept);
  }
}
