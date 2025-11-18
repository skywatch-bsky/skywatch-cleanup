export function isRecordNotFoundError(error: any): boolean {
  return (
    error?.error === "RecordNotFound" ||
    error?.message?.includes("RecordNotFound")
  );
}
