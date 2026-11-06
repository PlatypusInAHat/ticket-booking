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
      if (err.response?.status === 401) {
        setError("Your admin session has expired. Please log in again.")
      } else if (err.response?.status === 403) {
        setError("You do not have permission to view API Gateway status.")
      } else if (err.response?.data?.message) {
        setError(err.response.data.message)
      } else {
        setError("Cannot connect to API Gateway. Server might be down.")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  return (
    <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

      <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="type-print text-5xl sm:text-6xl">API Management</h1>
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
        <div className="relative z-10 mb-8 rounded-xl border border-danger/30 bg-danger/10 px-5 py-4 text-sm font-semibold text-danger">
          {error}
        </div>
      )}

      {data && (
        <>
          <section className="mb-10 grid gap-6 md:grid-cols-2">
            <div className="bg-surface rounded-2xl border border-border p-6 flex items-center gap-5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-bold uppercase tracking-wider text-muted">Gateway Status</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="relative flex h-3 w-3">
                    <span className="relative inline-flex rounded-md h-3 w-3 bg-success"></span>
                  </span>
                  <p className="text-2xl font-black text-success">
                    {data.gateway.status}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-2xl border border-border p-6 flex items-center justify-between">
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

          <h2 className="mb-6 type-print text-3xl">Microservices Health</h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4 mb-12">
            {data.services.map((service: any) => {
              const isUp = service.status === "UP"
              return (
                <div key={service.name} className="bg-surface rounded-2xl border border-border p-6 relative overflow-hidden">
                  <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    isUp ? "bg-success" : "bg-danger"
                  )} />
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <Server className="h-5 w-5 text-muted" />
                      <h3 className="font-bold text-foreground">{service.name}</h3>
                    </div>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-bold",
                      isUp ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
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
                    <div className="text-sm text-danger">
                      <p>❌ Connection Error: {service.error}</p>
                      <p>Please check the terminal.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <h2 className="mb-6 type-print text-3xl">Active Routes (Gateway Map)</h2>
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
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
