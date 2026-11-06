export type AdminRole = 'admin' | 'dispatcher' | 'er-staff'
export type AdminTab = 'overview' | 'hospitals' | 'ambulances' | 'alerts' | 'analytics' | 'schema' | 'beds'
export type SelectableRole = AdminRole | 'citizen'

export const ROLE_OPTIONS: { value: SelectableRole; label: string }[] = [
  { value: 'admin', label: 'Admin / Network Manager' },
  { value: 'dispatcher', label: 'Dispatcher' },
  { value: 'er-staff', label: 'Hospital ER Staff' },
  { value: 'citizen', label: 'Public / Citizen' },
]

export const ROLE_TABS: Record<AdminRole, AdminTab[]> = {
  admin: ['overview', 'hospitals', 'ambulances', 'alerts', 'analytics', 'schema'],
  dispatcher: ['ambulances', 'alerts', 'analytics'],
  'er-staff': ['beds', 'alerts'],
}

export const DEFAULT_ROLE_TAB: Record<AdminRole, AdminTab> = {
  admin: 'overview',
  dispatcher: 'ambulances',
  'er-staff': 'beds',
}
