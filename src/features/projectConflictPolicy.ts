type ProjectConflictDialogPolicyArgs = {
  hasConflicts: boolean;
  hasShownConflictDialog: boolean;
};

export const shouldAutoOpenConflictDialog = ({
  hasConflicts,
  hasShownConflictDialog,
}: ProjectConflictDialogPolicyArgs) => hasConflicts && !hasShownConflictDialog;
