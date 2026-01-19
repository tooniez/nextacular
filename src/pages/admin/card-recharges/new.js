import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import AccountLayout from '@/layouts/AccountLayout';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import Button from '@/components/Button/index';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CreditCardIcon,
  CurrencyEuroIcon,
} from '@heroicons/react/24/outline';

export default function AdminCardRechargeNewPage() {
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const router = useRouter();

  const [formData, setFormData] = useState({
    cardSerial: '',
    amount: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !isSuperAdmin) {
      router.push('/account');
    }
  }, [isSuperAdmin, isAuthLoading, router]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.cardSerial) {
      toast.error('Il seriale carta è obbligatorio');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      toast.error('L\'importo deve essere maggiore di 0');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/card-recharges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardSerial: formData.cardSerial,
          amount: parseFloat(formData.amount),
        }),
      });

      const result = await response.json();

      if (result.errors) {
        Object.keys(result.errors).forEach((error) =>
          toast.error(result.errors[error].msg)
        );
      } else {
        toast.success('Ricarica carta completata con successo');
        router.push('/admin/card-recharges');
      }
    } catch (error) {
      toast.error('Errore durante la ricarica');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <Meta title="Caricamento..." />
        <div className="p-6">Caricamento...</div>
      </AccountLayout>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <AccountLayout>
      <Meta title="Ricarica Carta - Super Admin" />
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/admin/card-recharges"
            className="p-2 hover:bg-gray-100 rounded"
          >
            <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="flex items-center gap-3">
            <CreditCardIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Ricarica Carta</h1>
          </div>
          <div className="ml-auto">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {isSubmitting ? 'Salvataggio...' : 'Salva'}
            </Button>
          </div>
        </div>

        {/* Form */}
        <Card>
          <Card.Body>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seriale Carta Fisica o Digitale da Ricaricare <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCardIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.cardSerial}
                      onChange={(e) => handleInputChange('cardSerial', e.target.value.toUpperCase())}
                      placeholder="SERIALE CARTA DA RICARICARE..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Importo Ricarica <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CurrencyEuroIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-red-600 mb-4">(*) Campo Obbligatorio</p>
              </div>
            </form>
          </Card.Body>
        </Card>
      </div>
    </AccountLayout>
  );
}
