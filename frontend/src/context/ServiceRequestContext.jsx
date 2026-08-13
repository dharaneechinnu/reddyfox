import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { SERVICES } from '../data';
import { formForService } from '../serviceForms';
import ServiceRequestModal from '../components/ServiceRequestModal';

const ServiceRequestContext = createContext({ open: () => {}, canOpen: () => false });

/**
 * Holds the one service pop-up, so anything on the site can open it.
 *
 * There is deliberately a single modal mounted at the app root rather than one
 * per card: a service card appears on the homepage, on /services and again in
 * the "other services" strip on a detail page, and each of those would
 * otherwise carry its own copy of the form's state. One instance also means
 * two cards can never be open at once.
 *
 * `canOpen` exists so a caller can fall back gracefully: a service listed in
 * data.js with no entry in serviceForms.js has no pop-up, and the card should
 * link to its detail page rather than opening an empty dialog.
 */
export function ServiceRequestProvider({ children }) {
  const [active, setActive] = useState(null);

  const open = useCallback((serviceId) => {
    const service = SERVICES.find((s) => s.id === serviceId);
    if (!service || !formForService(serviceId)) return false;
    setActive(service);
    return true;
  }, []);

  const close = useCallback(() => setActive(null), []);

  const value = useMemo(() => ({
    open,
    canOpen: (serviceId) => !!formForService(serviceId),
  }), [open]);

  return (
    <ServiceRequestContext.Provider value={value}>
      {children}
      {active && (
        <ServiceRequestModal
          // Remounts on a service change, so switching services never carries
          // the previous form's half-filled answers across.
          key={active.id}
          serviceId={active.id}
          serviceTitle={active.title}
          onClose={close}
        />
      )}
    </ServiceRequestContext.Provider>
  );
}

export const useServiceRequest = () => useContext(ServiceRequestContext);
