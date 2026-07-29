import { useState } from 'react';
import { runValidators } from '../validation';

/**
 * Shared state machine for the three website forms (enquiry, quote, rate lock).
 *
 * Behaviour, identical across all of them:
 *  - validate on blur and on submit
 *  - an error clears while typing as soon as the field becomes valid
 *  - on a failed submit, focus moves to the first invalid field
 *  - server-side rejections are mapped back onto the matching field, because
 *    the API re-validates independently and may catch things the client cannot
 *    (an unknown currency code, for example)
 *
 * @param initial     object of starting values (include `enquiry_ref: ''` honeypot)
 * @param validators  { field: (value, allValues) => errorMessage | null }
 * @param submitFn    (values) => Promise<responseBody>
 * @param idPrefix    DOM id prefix, so focus targeting works per form
 */
export default function useLeadForm({ initial, validators, submitFn, idPrefix }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [result, setResult] = useState(null); // truthy => submitted successfully

  const focusField = (field) => document.getElementById(`${idPrefix}-${field}`)?.focus();

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      const check = validators[field];
      if (check && !check(value, { ...values, [field]: value })) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const check = validators[field];
    if (!check) return;
    const message = check(values[field], values);
    setErrors((prev) => {
      const next = { ...prev };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    const found = runValidators(values, validators);
    setErrors(found);
    setTouched(Object.fromEntries(Object.keys(validators).map((k) => [k, true])));

    if (Object.keys(found).length) {
      focusField(Object.keys(validators).find((k) => found[k]));
      return;
    }

    setSending(true);
    try {
      const body = await submitFn(values);
      setResult(body || {});
    } catch (err) {
      if (err.fieldErrors) {
        setErrors(err.fieldErrors);
        focusField(Object.keys(err.fieldErrors)[0]);
      }
      setServerError(err.message);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setValues(initial);
    setErrors({});
    setTouched({});
    setServerError(null);
    setResult(null);
  };

  return {
    values, setField, errors, touched, sending, serverError, result,
    handleBlur, handleSubmit, reset,
    errorCount: Object.keys(errors).length,
    // A field shows its error once it has been blurred or a submit was attempted.
    errorFor: (field) => (touched[field] ? errors[field] : undefined),
  };
}
