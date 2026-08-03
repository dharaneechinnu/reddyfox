import { createContext, useContext } from 'react';
import useApi from '../hooks/useApi';
import { fetchSiteSettings } from '../api';
import { CONTACT as DEFAULT_CONTACT, SOCIALS as DEFAULT_SOCIALS, COMPANY } from '../company';

const DEFAULT_FOOTER = { legalName: COMPANY.legalName, tagline: `${COMPANY.regulator}. Foreign currency exchange, money transfer and remittance services in Chennai since ${COMPANY.since}.` };

const DEFAULT_VALUE = {
  contact: DEFAULT_CONTACT,
  socials: DEFAULT_SOCIALS,
  footer: DEFAULT_FOOTER,
  primaryPhone: DEFAULT_CONTACT.mobiles[0],
};

const CompanyInfoContext = createContext(DEFAULT_VALUE);

// Module scope so useApi doesn't refetch on every render.
const loadSiteSettings = () => fetchSiteSettings();

/**
 * Company contact info (address, phone numbers, email, social links) —
 * edited once in the Django admin under Content -> Site settings, and
 * reflected everywhere the site shows it: the header top bar, the footer,
 * the Contact page, and every "call us" prompt.
 *
 * Falls back to the real, last-published values in company.js while this is
 * loading, or if the API is unreachable — the same fail-open rule already
 * used by feature_flags and notifications elsewhere in this app. A network
 * hiccup should never blank out the shop's phone number.
 */
export function CompanyInfoProvider({ children }) {
  const { data } = useApi(loadSiteSettings, null);
  const value = data?.contact
    ? {
      contact: data.contact,
      socials: data.socials?.length ? data.socials : DEFAULT_SOCIALS,
      footer: data.footer?.tagline ? data.footer : DEFAULT_FOOTER,
      primaryPhone: data.contact.mobiles[0] || DEFAULT_VALUE.primaryPhone,
    }
    : DEFAULT_VALUE;

  return <CompanyInfoContext.Provider value={value}>{children}</CompanyInfoContext.Provider>;
}

export function useCompanyInfo() {
  return useContext(CompanyInfoContext);
}
