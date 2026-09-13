import React from 'react'
import { useSupabaseData } from '@/hooks/useSupabaseData'
import { DashboardSummaryBar } from '@/components/DashboardSummaryBar'
import { HospitalCard } from '@/components/HospitalCard'
import { Button } from '@/components/ui/button'
import { Building2, RefreshCw, Database, AlertCircle, Info } from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const {
    hospitals,
    loading,
    error,
    isLive,
    isConfigured,
    isSeeding,
    refetch,
    seedDatabase,
    updateBedOccupancy,
  } = useSupabaseData()

  // Handler for dev-only Simulate Admission button (+1 bed count in Supabase)
  const handleSimulateAdmission = (hospitalId: string) => {
    updateBedOccupancy(hospitalId, 1)
  }

  return (
    <div className="space-y-6">
      {/* Notice if Supabase keys not set */}
      {!isConfigured && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-200 text-sm">
                Supabase Credentials Required for Live Database Updates
              </h4>
              <p className="text-slate-400 mt-0.5">
                Currently running in mock telemetry mode. To connect your live Supabase project, update{' '}
                <code className="text-emerald-400 font-mono">VITE_SUPABASE_URL</code> and{' '}
                <code className="text-emerald-400 font-mono">VITE_SUPABASE_ANON_KEY</code> in{' '}
                <code className="text-slate-200 font-mono">.env.local</code>.
              </p>
            </div>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={seedDatabase}
            disabled={isSeeding}
            className="text-xs shrink-0 space-x-1.5 bg-slate-100 text-slate-900 font-bold"
          >
            <Database className="h-3.5 w-3.5" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Database'}</span>
          </Button>
        </div>
      )}

      {/* Error Notice */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-200 flex items-center space-x-3">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Telemetry Summary Bar */}
      <DashboardSummaryBar hospitals={hospitals} isLive={isLive} />

      {/* Main Grid Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-200">
            <Building2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100 font-mono uppercase tracking-wide">
              City Hospitals Operations Grid
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Real-time hospital bed availability & capacity indicators
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="text-xs space-x-1.5 border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={seedDatabase}
            disabled={isSeeding}
            className="text-xs space-x-1.5 bg-slate-100 text-slate-900 hover:bg-slate-200 font-bold border-none"
          >
            <Database className="h-3.5 w-3.5" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Database'}</span>
          </Button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && hospitals.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse p-6"
            />
          ))}
        </div>
      )}

      {/* Responsive Grid of Hospital Cards */}
      {hospitals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {hospitals.map((hospital) => (
            <HospitalCard
              key={hospital.id}
              hospital={hospital}
              onSimulateAdmission={handleSimulateAdmission}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && hospitals.length === 0 && (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40">
          <Building2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <h4 className="text-slate-200 font-bold text-sm">No Hospitals Found</h4>
          <p className="text-slate-400 text-xs mt-1">
            Click "Seed Database" above or execute the `schema.sql` script in Supabase.
          </p>
          <Button
            variant="default"
            size="sm"
            onClick={seedDatabase}
            disabled={isSeeding}
            className="mt-4 text-xs bg-slate-100 text-slate-900 font-bold"
          >
            Seed Sample Hospitals
          </Button>
        </div>
      )}
    </div>
  )
}
