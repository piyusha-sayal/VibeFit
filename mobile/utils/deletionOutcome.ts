/**
 * What the delete-account screen tells the user once the server has deleted
 * the data. "Account deleted" is only true when the Firebase sign-in is gone
 * too; otherwise the same email could sign back in.
 */
export interface DeletionResult {
  signInRemoved: boolean;
  photographsAttempted: number;
  photographsRemoved: number;
}

export function deletionOutcome(result: DeletionResult): { title: string; message: string } {
  const unreached = result.photographsAttempted - result.photographsRemoved;
  const photoNote = unreached > 0
    ? `\n\n${unreached} stored photograph(s) could not be reached and will be removed by our cleanup.`
    : '';
  if (result.signInRemoved) {
    return { title: 'Your account is deleted', message: `Thank you for trying MyLookFit.${photoNote}` };
  }
  return {
    title: 'Your data is deleted',
    message: 'Your sign-in could not be removed just now, usually because it is not recent enough. '
      + `To finish, sign in again and delete once more.${photoNote}`,
  };
}
