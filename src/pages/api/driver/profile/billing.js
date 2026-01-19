/**
 * Driver billing profile
 * PATCH: update billingProfile JSON
 */
import prisma from '@/prisma/index';
import { requireDriver } from '@/lib/server/require-driver';

function normalizeString(v) {
  if (typeof v !== 'string') return '';
  return v.trim();
}

function validateBillingProfile(bp) {
  const errors = {};
  const type = bp?.type === 'company' ? 'company' : 'private';

  const fullName = normalizeString(bp?.fullName);
  const companyName = normalizeString(bp?.companyName);
  const taxCode = normalizeString(bp?.taxCode).toUpperCase();
  const vatNumber = normalizeString(bp?.vatNumber).toUpperCase();
  const address = normalizeString(bp?.address);
  const city = normalizeString(bp?.city);
  const zip = normalizeString(bp?.zip);
  const country = normalizeString(bp?.country || 'IT').toUpperCase();
  const pec = normalizeString(bp?.pec);
  const sdi = normalizeString(bp?.sdi).toUpperCase();

  if (!fullName) errors.fullName = { msg: type === 'company' ? 'Referente obbligatorio' : 'Nome e cognome obbligatorio' };
  if (!address) errors.address = { msg: 'Indirizzo obbligatorio' };
  if (!city) errors.city = { msg: 'Città obbligatoria' };
  if (!zip) errors.zip = { msg: 'CAP obbligatorio' };
  if (!country) errors.country = { msg: 'Paese obbligatorio' };

  if (type === 'private') {
    if (!taxCode) errors.taxCode = { msg: 'Codice fiscale obbligatorio' };
  } else {
    if (!companyName) errors.companyName = { msg: 'Ragione sociale obbligatoria' };
    if (!vatNumber) errors.vatNumber = { msg: 'Partita IVA obbligatoria' };
    if (pec && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pec)) errors.pec = { msg: 'PEC non valida' };
    if (sdi && !/^[A-Z0-9]{6,7}$/.test(sdi)) errors.sdi = { msg: 'Codice SDI non valido' };
  }

  return {
    errors,
    billingProfile: {
      type,
      fullName,
      companyName: type === 'company' ? companyName : '',
      taxCode: type === 'private' ? taxCode : '',
      vatNumber: type === 'company' ? vatNumber : '',
      address,
      city,
      zip,
      country,
      pec: type === 'company' ? pec : '',
      sdi: type === 'company' ? sdi : '',
    },
  };
}

const handler = async (req, res) => {
  const { method } = req;
  if (method !== 'PATCH') {
    return res.status(405).json({ errors: { error: { msg: `${method} method unsupported` } } });
  }

  const auth = await requireDriver(req, res);
  if (!auth) return;
  const { endUser } = auth;

  try {
    const { billingProfile } = req.body || {};
    if (billingProfile === undefined) {
      return res.status(400).json({ errors: { billingProfile: { msg: 'billingProfile required' } } });
    }

    const { errors, billingProfile: normalized } = validateBillingProfile(billingProfile);
    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const updated = await prisma.endUser.update({
      where: { id: endUser.id },
      data: { billingProfile: normalized },
      select: { id: true, billingProfile: true },
    });

    return res.status(200).json({ data: updated });
  } catch (error) {
    console.error('PATCH /api/driver/profile/billing error:', error);
    return res.status(500).json({ errors: { error: { msg: error.message || 'Internal server error' } } });
  }
};

export default handler;

