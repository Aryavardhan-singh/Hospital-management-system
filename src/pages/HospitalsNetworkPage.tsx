import React, { useState, useMemo } from 'react'
import { useSupabaseData } from '@/hooks/useSupabaseData'
import { HospitalNetworkCard } from '@/components/HospitalNetworkCard'
import { HospitalDetailModal } from '@/components/HospitalDetailModal'
import { Hospital } from '@/types'
import { Building2, Search, Filter, ArrowUpDown, Stethoscope, RefreshCw, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const HospitalsNetworkPage: React.FC = () => {
  const {
    hospitals,
    ambulances,
    loading,
    isLive,
    isSeeding,
    refetch,
    seedDatabase,
    updateBedOccupancy,
    simulateCapacityCrisis,
  } = useSupabaseData()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'critical' | 'available' | 'name'>('critical')

  // Selected hospital for Modal view
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null)

  // Extract all unique specialties for the filter dropdown
  const allSpecialties = useMemo(() => {
    const set = new Set<string>()
    hospitals.forEach((h) => {
      h.specialties.forEach((s) => set.add(s))
    })
    return Array.from(set).sort()
  }, [hospitals])

  // Filter and sort hospitals
  const filteredHospitals = useMemo(() => {
    return hospitals
      .filter((h) => {
        // Search query check
        const matchesSearch =
          h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()))

        // Specialty filter check
        const matchesSpecialty =
          selectedSpecialty === 'all' || h.specialties.includes(selectedSpecialty)

        return matchesSearch && matchesSpecialty
      })
      .sort((a, b) => {
        if (sortBy === 'critical') {
          // Highest occupancy ratio first
          const ratioA = a.total_beds > 0 ? a.occupied_beds / a.total_beds : 0
          const ratioB = b.total_beds > 0 ? b.occupied_beds / b.total_beds : 0
          return ratioB - ratioA
        } else if (sortBy === 'available') {
          // Most available beds first
          const availA = a.total_beds - a.occupied_beds
          const availB = b.total_beds - b.occupied_beds
          return availB - availA
        } else {
          // Alphabetical Name
          return a.name.localeCompare(b.name)
        }
      })
  }, [hospitals, searchQuery, selectedSpecialty, sortBy])

  // Find currently selected hospital instance
  const activeHospital = useMemo(
    () => hospitals.find((h) => h.id === selectedHospitalId) || null,
    [hospitals, selectedHospitalId]
  )

  return (
    <div className="space-y-6 select-none font-sans">
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Building2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              City Hospitals Network
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {hospitals.length} FACILITIES
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Real-time capacity tracking, bed availability matrix, and emergency department telemetry
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            className="h-10 px-4 rounded-2xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs space-x-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-500" />
            <span>Refresh Data</span>
          </Button>

          <Button
            size="sm"
            onClick={seedDatabase}
            disabled={isSeeding}
            className="h-10 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 space-x-2 border-none"
          >
            <Database className="h-4 w-4" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Database'}</span>
          </Button>
        </div>
      </div>

      {/* Filter & Sort Control Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by hospital name or area..."
            className="w-full h-10 pl-10 pr-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
          />
        </div>

        {/* Dropdowns Group */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Specialty Filter Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3 py-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-400 font-extrabold uppercase text-[10px]">Specialty:</span>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">All Specialties ({hospitals.length})</option>
              {allSpecialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3 py-1.5 text-xs">
            <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <span className="text-slate-400 font-extrabold uppercase text-[10px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-800 font-bold focus:outline-none cursor-pointer"
            >
              <option value="critical">Most Critical Capacity First</option>
              <option value="available">Highest Available Beds</option>
              <option value="name">Alphabetical Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Hospital Cards Responsive Grid */}
      {loading && hospitals.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-64 rounded-[2rem] bg-white border border-slate-100 shadow-sm animate-pulse p-6"
            />
          ))}
        </div>
      ) : filteredHospitals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHospitals.map((hospital) => (
            <HospitalNetworkCard
              key={hospital.id}
              hospital={hospital}
              isLive={isLive}
              onClick={() => setSelectedHospitalId(hospital.id)}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-white">
          <Stethoscope className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-slate-900 font-black text-base">No Hospitals Match Filter</h3>
          <p className="text-slate-500 text-xs mt-1">
            Try resetting your search query or specialty filter to view all facilities.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchQuery('')
              setSelectedSpecialty('all')
            }}
            className="mt-4 rounded-xl border-slate-200 text-slate-800 font-bold text-xs"
          >
            Reset Filters
          </Button>
        </div>
      )}

      {/* Hospital Detail Modal View */}
      <HospitalDetailModal
        hospital={activeHospital}
        ambulances={ambulances}
        isLive={isLive}
        onClose={() => setSelectedHospitalId(null)}
        onUpdateOccupancy={updateBedOccupancy}
        onCapacityCrisis={simulateCapacityCrisis}
      />
    </div>
  )
}
