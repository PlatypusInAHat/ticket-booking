import { useCallback, useEffect, useState } from "react"
import { Activity, Server, ArrowRight, ShieldCheck, RefreshCw } from "lucide-react"
import { adminAPI } from "@/services/api"
import { cn } from "@/lib/utils"

export function ApiManagement() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const response = await adminAPI.getGatewayStatus()
      setData(response.data)
    } catch (err: any) {
      setError("Cannot connect to API Gateway. Server might be down.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-blue-500/10 blur-[150px] pointer-events-none" />

      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="mb-3 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]">
            System Admin
          </span>
          <h1 className="font-display text-4xl font-black text-foreground">API Management</h1>
          <p className="mt-2 text-muted">Monitor microservices health, routes, and gateway status.</p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-foreground hover:bg-accent-strong disabled:opacity-50"
        >
          <RefreshCw className={cn("h-5 w-5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="relative z-10 mb-8 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-500">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="mb-10 grid gap-6 md:grid-cols-2">
            <div className="glass rounded-2xl border border-border p-6 flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/10 text-green-500">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-muted">Gateway Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                  <p className="text-2xl font-black text-green-500">
                    {data.gateway.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl border border-border p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-muted">Uptime</p>
                <p className="mt-1 text-2xl font-black text-foreground">
                  {Math.floor(data.gateway.uptime / 60)} minutes
                </p>
              </div>
              <a
                href={(import.meta as any).env.VITE_API_URL?.replace('/api', '') + '/api-docs'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-semibold hover:bg-surface-3"
              >
                Swagger API Docs <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </section>

          <h2 className="mb-6 font-display text-2xl font-black text-foreground">Microservices Health</h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mb-12">
            {data.services.map((service: any) => {
              const isUp = service.status === "UP"
              return (
                <div key={service.name} className="glass rounded-2xl border border-border p-6 relative overflow-hidden">
                  <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    isUp ? "bg-green-500" : "bg-red-500"
                  )} />
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-muted" />
                      <h3 className="font-bold text-foreground">{service.name}</h3>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-bold",
                      isUp ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                      {service.status}
                    </span>
                  </div>
                  {isUp ? (
                    <div className="text-sm text-muted">
                      <p> API Response: OK</p>
                      <p> Timestamp: {new Date(service.detail?.timestamp).toLocaleTimeString()}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-red-400">
                      <p>❌ Connection Error: {service.error}</p>
                      <p>Please check the terminal.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <h2 className="mb-6 font-display text-2xl font-black text-foreground">Active Routes (Gateway Map)</h2>
          <div className="glass rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-xs font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-6 py-4">Service Name</th>
                  <th className="px-6 py-4">Target Node</th>
                  <th className="px-6 py-4">Route Prefixes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {data.routes.map((route: any) => (
                  <tr key={route.name} className="hover:bg-surface-2 transition-colors">
                    <td className="px-6 py-4 font-bold text-foreground">{route.name}</td>
                    <td className="px-6 py-4 text-accent font-mono">{route.target}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {route.prefixes.map((prefix: string) => (
                          <span key={prefix} className="px-2 py-1 bg-surface-3 rounded border border-border text-xs text-muted font-mono">
                            {prefix}/*
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
