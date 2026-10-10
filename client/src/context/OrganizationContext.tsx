import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getAllOrgs, type Organization } from '@/services/oraganizations/org.services';

interface OrganizationState {
  organizations: Organization[];
  activeOrganization: Organization | null;
  activeOrganizationId: string;
  loadingOrganizations: boolean;
  organizationError: string;
  refreshOrganizations: () => Promise<void>;
  selectOrganization: (id: string) => void;
}

const OrganizationContext = createContext<OrganizationState | undefined>(undefined);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [activeOrganizationId, setActiveOrganizationId] = useState(() => localStorage.getItem('cashflow-active-organization') ?? '');
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [organizationError, setOrganizationError] = useState('');

  const refreshOrganizations = useCallback(async () => {
    setLoadingOrganizations(true);
    setOrganizationError('');
    try {
      const result = await getAllOrgs();
      const next = result ?? [];
      setOrganizations(next);
      setActiveOrganizationId((current) => {
        const valid = next.some((organization) => organization.id === current);
        const chosen = valid ? current : '';
        if (chosen) localStorage.setItem('cashflow-active-organization', chosen);
        else localStorage.removeItem('cashflow-active-organization');
        return chosen;
      });
    } catch (cause) {
      setOrganizationError(cause instanceof Error ? cause.message : 'Could not load organizations.');
    } finally {
      setLoadingOrganizations(false);
    }
  }, []);

  useEffect(() => { void refreshOrganizations(); }, [refreshOrganizations]);

  const selectOrganization = useCallback((id: string) => {
    setActiveOrganizationId(id);
    if (id) localStorage.setItem('cashflow-active-organization', id);
    else localStorage.removeItem('cashflow-active-organization');
  }, []);

  const activeOrganization = organizations.find((organization) => organization.id === activeOrganizationId) ?? null;
  const value = useMemo(() => ({ organizations, activeOrganization, activeOrganizationId, loadingOrganizations, organizationError, refreshOrganizations, selectOrganization }), [organizations, activeOrganization, activeOrganizationId, loadingOrganizations, organizationError, refreshOrganizations, selectOrganization]);
  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error('useOrganization must be used within OrganizationProvider');
  return context;
}
