export const DATA_WRITE_ERROR_EVENT = 'mednet:data-write-error'

export function reportDataWriteError(operation: string, error: unknown): Error {
  const cause = error instanceof Error ? error.message : String(error)
  const failure = new Error(`${operation} failed: ${cause}`)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(DATA_WRITE_ERROR_EVENT, {
        detail: { message: failure.message },
      })
    )
  }

  return failure
}
