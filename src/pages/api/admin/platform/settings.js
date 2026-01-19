/**
 * Super Admin Platform Settings API
 * GET: Get platform settings
 * PUT: Update platform settings
 */
import { verifySuperAdmin } from '@/lib/server/require-super-admin';
import prisma from '@/prisma/index';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/server/auth';

const handler = async (req, res) => {
  const { method } = req;

  if (method === 'GET') {
    try {
      await verifySuperAdmin(req, res);

      let settings = await prisma.platformSettings.findFirst();
      if (!settings) {
        settings = await prisma.platformSettings.create({
          data: { version: 1 },
        });
      }

      const companyFiscalData = settings.companyFiscalData
        ? JSON.parse(settings.companyFiscalData)
        : {};
      const vatRates = settings.vatRates
        ? JSON.parse(settings.vatRates)
        : { standard: 22, reduced: 10 };
      const passwordPolicy = settings.passwordPolicy
        ? JSON.parse(settings.passwordPolicy)
        : {};

      return res.status(200).json({
        data: {
          ...settings,
          companyFiscalData,
          vatRates,
          passwordPolicy,
        },
      });
    } catch (error) {
      console.error('GET /api/admin/platform/settings error:', error);

      if (error.message === 'Unauthorized: Super Admin access required') {
        return res.status(401).json({
          errors: { auth: { msg: error.message } },
        });
      }

      return res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }

  if (method === 'PUT') {
    try {
      await verifySuperAdmin(req, res);

      const session = await getServerSession(req, res, authOptions);
      const userId = session?.user?.id;

      let settings = await prisma.platformSettings.findFirst();
      if (!settings) {
        settings = await prisma.platformSettings.create({
          data: { version: 1 },
        });
      }

      const updateData = req.body || {};
      const baseCompanyData = settings.companyFiscalData
        ? JSON.parse(settings.companyFiscalData)
        : {};

      const update = {
        version: settings.version + 1,
      };

      // Merge helper
      const mergeCompanyData = (patch) =>
        JSON.stringify({ ...baseCompanyData, ...patch });

      if (updateData.application) {
        update.companyFiscalData = mergeCompanyData(updateData.application);
      }

      if (updateData.support) {
        update.companyFiscalData = mergeCompanyData({ support: updateData.support });
      }

      if (updateData.integrations) {
        if (updateData.integrations.stripe) {
          update.stripeSecretKey =
            updateData.integrations.stripe.apiKey || settings.stripeSecretKey;
          update.stripePublishableKey =
            updateData.integrations.stripe.publicKey || settings.stripePublishableKey;
        }

        if (updateData.integrations.fatturaPerTutti) {
          update.providerApiKey =
            updateData.integrations.fatturaPerTutti.apiKey || settings.providerApiKey;
          update.companyFiscalData = mergeCompanyData({
            fatturaPerTuttiPassword: updateData.integrations.fatturaPerTutti.password,
          });
        }

        if (updateData.integrations.google) {
          update.googleMapsApiKey =
            updateData.integrations.google.mapsApiKey || settings.googleMapsApiKey;
          update.companyFiscalData = mergeCompanyData({
            googleClientId: updateData.integrations.google.clientId,
          });
        }

        if (updateData.integrations.hubject) {
          update.hubjectOperatorId =
            updateData.integrations.hubject.operatorId || settings.hubjectOperatorId;
          update.hubjectEMPId =
            updateData.integrations.hubject.empId || settings.hubjectEMPId;
          update.companyFiscalData = mergeCompanyData({
            hubject: updateData.integrations.hubject,
          });
        }
      }

      if (updateData.billing) {
        update.companyFiscalData = mergeCompanyData({ billing: updateData.billing });
        if (updateData.billing.vatRate) {
          update.vatRates = JSON.stringify({ standard: updateData.billing.vatRate });
        }
      }

      if (updateData.languageCurrency) {
        update.currency = updateData.languageCurrency.currency || settings.currency;
        update.companyFiscalData = mergeCompanyData({
          languageCurrency: updateData.languageCurrency,
        });
      }

      if (updateData.security) {
        update.maxLoginAttempts =
          updateData.security.maxLoginAttempts || settings.maxLoginAttempts;
        update.ipBlockThreshold =
          updateData.security.ipBlockThreshold || settings.ipBlockThreshold;
        update.enable2FA = updateData.security.enable2FA ?? settings.enable2FA;
        update.recaptchaEnabled = updateData.security.recaptchaEnabled ?? settings.recaptchaEnabled;
        update.recaptchaSiteKey =
          updateData.security.recaptchaSiteKey || settings.recaptchaSiteKey;
        update.recaptchaSecretKey =
          updateData.security.recaptchaSecretKey || settings.recaptchaSecretKey;

        update.companyFiscalData = mergeCompanyData({ security: updateData.security });
      }

      const updatedSettings = await prisma.platformSettings.update({
        where: { id: settings.id },
        data: update,
      });

      if (userId) {
        try {
          await prisma.platformSettingsHistory.create({
            data: {
              settingsId: settings.id,
              changedByUserId: userId,
              oldValues: settings,
              newValues: updatedSettings,
            },
          });
        } catch (err) {
          console.error('Failed to create settings history:', err);
        }
      }

      return res.status(200).json({ data: updatedSettings });
    } catch (error) {
      console.error('PUT /api/admin/platform/settings error:', error);
      return res.status(500).json({
        errors: { error: { msg: error.message || 'Internal server error' } },
      });
    }
  }

  return res.status(405).json({
    errors: { error: { msg: `${method} method unsupported` } },
  });
};

export default handler;
