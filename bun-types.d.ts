declare namespace Bun {
  const env: Record<string, string | undefined>

  interface BunFile extends Blob {
    readonly name?: string
    exists(): Promise<boolean>
  }

  function file(path: string | URL): BunFile

  interface Server {
    readonly hostname: string
    readonly port: number
    stop(closeActiveConnections?: boolean): void
  }

  interface ServeOptions {
    port?: number
    hostname?: string
    fetch(request: Request, server: Server): Response | Promise<Response>
    error?(error: Error): Response | Promise<Response>
  }

  function serve(options: ServeOptions): Server

  interface Subprocess {
    readonly pid: number
    readonly exited: Promise<number>
    kill(signal?: number | string): void
  }

  function spawn(command: readonly string[]): Subprocess
}
