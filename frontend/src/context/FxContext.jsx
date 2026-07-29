import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { fmt } from '../data';
import { fetchCurrencies, toRatesMap, popularCodes, latestUpdatedAt } from '../api';

const FxContext = createContext(null);

export function FxProvider({ children }) {
  const [amount, setAmount] = useState('1000');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('INR');
  const [favs, setFavs] = useState(['USD', 'EUR', 'GBP']);
  const [filter, setFilter] = useState('All');
  const [q, setQ] = useState('');

  const [rates, setRates] = useState({ INR: { n: 'Indian Rupee', cc: 'IN', b: 1, s: 1, d: 0, r: 'Asia-Pacific' } });
  const [popular, setPopular] = useState([]);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState(null);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState(null);

  const loadRates = useCallback(() => {
    setRatesLoading(true);
    setRatesError(null);
    fetchCurrencies()
      .then((list) => {
        setRates(toRatesMap(list));
        setPopular(popularCodes(list));
        setRatesUpdatedAt(latestUpdatedAt(list));
      })
      .catch((err) => setRatesError(err.message))
      .finally(() => setRatesLoading(false));
  }, []);

  useEffect(() => { loadRates(); }, [loadRates]);

  const rateOf = useCallback((code) => (rates[code] || rates.INR).s, [rates]);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const toggleFav = (code) => {
    setFavs((prev) => (prev.indexOf(code) >= 0 ? prev.filter((c) => c !== code) : prev.concat([code])));
  };

  const calc = useMemo(() => {
    const amt = parseFloat(String(amount).replace(/[^0-9.]/g, '')) || 0;
    const rate = rateOf(from) / rateOf(to);
    const converted = amt * rate;
    return {
      amt, rate, converted: fmt(converted, to === 'JPY' || to === 'THB' ? 0 : 2),
      rateLine: `1 ${from} = ${fmt(rate, rate < 5 ? 4 : 2)} ${to}`,
      amountLabel: `${fmt(amt, 2)} ${from}`,
    };
  }, [amount, from, to, rateOf]);

  const value = {
    amount, setAmount, from, setFrom, to, setTo, swap,
    favs, toggleFav, filter, setFilter, q, setQ,
    calc,
    rates, popular, ratesUpdatedAt, ratesLoading, ratesError, reloadRates: loadRates,
    currencyList: Object.keys(rates).map((code) => ({ code, label: code })),
  };

  return <FxContext.Provider value={value}>{children}</FxContext.Provider>;
}

export function useFx() {
  const ctx = useContext(FxContext);
  if (!ctx) throw new Error('useFx must be used within FxProvider');
  return ctx;
}
