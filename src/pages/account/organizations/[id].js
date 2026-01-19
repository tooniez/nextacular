import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import fetcher from '@/lib/client/fetcher';
import AccountLayout from '@/layouts/AccountLayout';
import { useSuperAdmin } from '@/hooks/data/useSuperAdmin';
import Meta from '@/components/Meta/index';
import Card from '@/components/Card/index';
import toast from 'react-hot-toast';

export default function EditOrganizationPage() {
  const router = useRouter();
  const { id } = router.query;
  const { isSuperAdmin, isLoading: isAuthLoading } = useSuperAdmin();
  const [activeTab, setActiveTab] = useState('dettaglio');
  const [isSaving, setIsSaving] = useState(false);
  
  // Form state for organization details - MUST be before any conditional returns
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    cap: '',
    comune: '',
    provincia: '',
    stato: 'Italia',
    referente: '',
    email: '',
    telefono: '',
    cellulare: '',
  });

  const { data, error, mutate } = useSWR(
    isSuperAdmin && id ? `/api/admin/workspaces/${id}` : null,
    fetcher
  );

  // Ensure organization is always defined (even if undefined)
  const organization = data?.data || null;

  // Update form when organization loads
  useEffect(() => {
    if (organization) {
      // Parse location if available
      const location = organization.stationLocation || '';
      const locationParts = location.split(',').map(p => p.trim());
      const address = locationParts[0] || '';
      const capComune = locationParts[1] || '';
      const capMatch = capComune.match(/(\d{5})/);
      const cap = capMatch ? capMatch[1] : '';
      const comuneFull = capComune.replace(/\d{5}\s*/, '').trim() || '';
      const comuneMatch = comuneFull.match(/^(.+?)\s*\(([A-Z]{2})\)$/);
      const comune = comuneMatch ? comuneMatch[1] : comuneFull;
      const provincia = comuneMatch ? comuneMatch[2] : '';

      setFormData({
        name: organization.name || '',
        address: address,
        cap: cap,
        comune: comune,
        provincia: provincia,
        stato: 'Italia',
        referente: organization.creator?.name || '',
        email: organization.creator?.email || '',
        telefono: '',
        cellulare: '',
      });
    }
  }, [organization]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (isSuperAdmin) return;
    // #region agent log
    fetch('/api/_debug/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: 'rbac',
        hypothesisId: 'ORG_UI_DENY',
        location: 'pages/account/organizations/[id].js',
        message: 'blocked organization detail (super admin only)',
        data: { hasId: Boolean(id) },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    router.replace('/account');
  }, [isAuthLoading, isSuperAdmin, router, id]);

  if (isAuthLoading) {
    return (
      <AccountLayout>
        <Meta title="Modifica Organizzazione - MSolution" />
        <div className="p-8">Loading...</div>
      </AccountLayout>
    );
  }

  if (!isSuperAdmin) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/workspaces/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          // Note: Address fields would need to be stored in workspace or stations
          // For now, we'll just update the name
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Organizzazione aggiornata con successo');
        mutate();
      } else {
        toast.error(result.errors?.error?.msg || 'Errore durante l\'aggiornamento');
      }
    } catch (error) {
      toast.error('Errore: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Sei sicuro di voler eliminare questa organizzazione?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/workspaces/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        toast.success('Organizzazione eliminata');
        router.push('/account/organizations');
      } else {
        toast.error(result?.errors?.error?.msg || 'Errore durante l\'eliminazione');
      }
    } catch (error) {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  if (error || !organization) {
    return (
      <AccountLayout>
        <Meta title="Modifica Organizzazione - MSolution" />
        <div className="p-8">
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <p className="text-red-800">
              Errore nel caricamento: {error?.message || 'Organizzazione non trovata'}
            </p>
          </div>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Modifica Organizzazione - ${organization.name} - MSolution`} />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/account/organizations')}
            className="text-blue-600 hover:text-blue-800 mb-4 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Torna alle Organizzazioni
          </button>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Modifica Organizzazione</h1>
              <p className="text-gray-600 mt-1">{organization.name}</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b mb-6">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('dettaglio')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'dettaglio'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dettaglio Organizzazione
            </button>
            <button
              onClick={() => setActiveTab('utenti')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'utenti'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Utenti
            </button>
            <button
              onClick={() => setActiveTab('competenze')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'competenze'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Competenze
            </button>
          </div>
        </div>

        {/* Dettaglio Organizzazione Tab */}
        {activeTab === 'dettaglio' && (
          <Card>
            <Card.Body>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Ragione Sociale <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Indirizzo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Comune <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.comune}
                        onChange={(e) => setFormData({ ...formData, comune: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Provincia <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.provincia}
                        onChange={(e) => setFormData({ ...formData, provincia: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div className="text-sm text-red-500">
                      (*) Campo Obbligatorio
                    </div>

                    <button
                      type="button"
                      onClick={handleDelete}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Cancella Organizzazione
                    </button>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Referente</label>
                      <input
                        type="text"
                        value={formData.referente}
                        onChange={(e) => setFormData({ ...formData, referente: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        placeholder="Referente..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        E-Mail <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Telefono</label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        placeholder="Telefono..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Cellulare</label>
                      <input
                        type="tel"
                        value={formData.cellulare}
                        onChange={(e) => setFormData({ ...formData, cellulare: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        placeholder="Cellulare..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        CAP <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.cap}
                        onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Stato <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.stato}
                        onChange={(e) => setFormData({ ...formData, stato: e.target.value })}
                        className="w-full px-4 py-2 border rounded"
                        required
                      >
                        <option value="Italia">Italia</option>
                        <option value="Altro">Altro</option>
                      </select>
                    </div>
                  </div>
                </div>
              </form>
            </Card.Body>
          </Card>
        )}

        {/* Utenti Tab */}
        {activeTab === 'utenti' && (
          <OrganizationUsersTab organizationId={id} />
        )}

        {/* Competenze Tab */}
        {activeTab === 'competenze' && (
          <OrganizationCompetenzeTab organizationId={id} organizationName={organization.name} />
        )}
      </div>
    </AccountLayout>
  );
}

// Component for Users Tab
function OrganizationUsersTab({ organizationId }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [isInviting, setIsInviting] = useState(false);

  const { data, error, mutate } = useSWR(
    organizationId ? `/api/admin/workspaces/${organizationId}/members` : null,
    fetcher
  );

  const members = data?.data || [];

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) {
      toast.error('Inserisci un indirizzo email');
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch(`/api/admin/workspaces/${organizationId}/invite-member`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: inviteEmail,
          teamRole: inviteRole,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Invito inviato con successo');
        setShowInviteModal(false);
        setInviteEmail('');
        setInviteRole('MEMBER');
        mutate();
      } else {
        toast.error(result.errors?.error?.msg || 'Errore durante l\'invio dell\'invito');
      }
    } catch (error) {
      toast.error('Errore: ' + error.message);
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Sei sicuro di voler rimuovere questo utente dall\'organizzazione?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/workspaces/${organizationId}/update-member`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberId }),
      });

      if (response.ok) {
        toast.success('Utente rimosso con successo');
        mutate();
      } else {
        const result = await response.json();
        toast.error(result.errors?.error?.msg || 'Errore durante la rimozione');
      }
    } catch (error) {
      toast.error('Errore: ' + error.message);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    try {
      const response = await fetch(`/api/admin/workspaces/${organizationId}/update-member`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ memberId, teamRole: newRole }),
      });

      if (response.ok) {
        toast.success('Ruolo aggiornato con successo');
        mutate();
      } else {
        const result = await response.json();
        toast.error(result.errors?.error?.msg || 'Errore durante l\'aggiornamento');
      }
    } catch (error) {
      toast.error('Errore: ' + error.message);
    }
  };

  return (
    <>
      <Card>
        <Card.Header className="bg-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold">Utenti dell&apos;Organizzazione</h2>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            + Aggiungi Utente
          </button>
        </Card.Header>
        <Card.Body>
          {error ? (
            <div className="text-red-600">Errore nel caricamento utenti</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nessun utente trovato</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Cognome e Nome</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">E-Mail</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Telefono</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Ruolo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Disabilitato</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Ultimo Aggiornamento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase">Azioni</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {member.member?.name || member.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{member.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">—</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={member.teamRole}
                          onChange={(e) => handleUpdateRole(member.id, e.target.value)}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="READONLY">Readonly</option>
                          <option value="FINANCE">Finance</option>
                          <option value="TECHNICIAN">Technician</option>
                          <option value="OPERATOR">Operator</option>
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                          <option value="OWNER">Owner</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {member.status === 'ACCEPTED' ? 'No' : 'Sì'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {member.joinedAt
                            ? new Date(member.joinedAt).toLocaleString('it-IT')
                            : member.invitedAt
                            ? new Date(member.invitedAt).toLocaleString('it-IT')
                            : '—'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Rimuovi
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Aggiungi Utente</h3>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">E-Mail</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                  required
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Ruolo</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2 border rounded"
                >
                  <option value="READONLY">Readonly</option>
                  <option value="FINANCE">Finance</option>
                  <option value="TECHNICIAN">Technician</option>
                  <option value="OPERATOR">Operator</option>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isInviting ? 'Invio...' : 'Invia Invito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Component for Competenze Tab
function OrganizationCompetenzeTab({ organizationId, organizationName }) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showReport, setShowReport] = useState(false);
  const [filters, setFilters] = useState({
    roaming: 'all', // all, yes, no
    minAmount: '',
    maxAmount: '',
  });

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
  ];

  const { data, error, mutate } = useSWR(
    showReport && organizationId
      ? `/api/admin/workspaces/${organizationId}/competenze?month=${selectedMonth}&year=${selectedYear}`
      : null,
    fetcher
  );

  const reportData = data?.data;
  const sessions = reportData?.sessions || [];
  const totals = reportData?.totals || {};

  // Filter sessions based on filters
  const filteredSessions = sessions.filter((session) => {
    if (filters.roaming === 'yes' && session.roaming !== 'Si') return false;
    if (filters.roaming === 'no' && session.roaming !== 'No') return false;
    if (filters.minAmount && session.grossRevenue < parseFloat(filters.minAmount)) return false;
    if (filters.maxAmount && session.grossRevenue > parseFloat(filters.maxAmount)) return false;
    return true;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleGenerateReport = () => {
    setShowReport(true);
    mutate();
  };

  const handlePrint = () => {
    window.print();
  };

  // Generate list of available months (last 24 months)
  const availableMonths = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    availableMonths.push({
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      label: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
    });
  }

  return (
    <Card>
      <Card.Header className="bg-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-semibold">Competenze</h2>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(parseInt(e.target.value));
              setShowReport(false);
            }}
            className="px-3 py-2 border rounded text-sm"
          >
            {monthNames.map((name, index) => (
              <option key={index} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(parseInt(e.target.value));
              setShowReport(false);
            }}
            className="px-3 py-2 border rounded text-sm"
          >
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerateReport}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            Genera Report
          </button>
        </div>
      </Card.Header>
      <Card.Body>
        {!showReport ? (
          <div className="text-center py-8 text-gray-500">
            Seleziona un mese e clicca &quot;Genera Report&quot; per visualizzare le competenze
          </div>
        ) : error ? (
          <div className="text-red-600">Errore nel caricamento del report</div>
        ) : (
          <div>
            {/* Report Header */}
            <div className="mb-6 p-4 bg-blue-50 rounded">
              <h3 className="text-lg font-bold mb-2">
                Riepilogo competenze derivanti dalle Ricariche sulle Vostre Stazioni di Ricarica -{' '}
                {monthNames[selectedMonth - 1].toUpperCase()} {selectedYear}
              </h3>
              <p className="text-sm text-gray-600">
                {organizationName} - {reportData?.workspace?.name || ''}
              </p>
            </div>

            {/* Filters */}
            <div className="mb-4 flex gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-1">Roaming</label>
                <select
                  value={filters.roaming}
                  onChange={(e) => setFilters({ ...filters, roaming: e.target.value })}
                  className="px-3 py-2 border rounded text-sm"
                >
                  <option value="all">Tutti</option>
                  <option value="yes">Solo Roaming</option>
                  <option value="no">Solo Locali</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Importo Min (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={filters.minAmount}
                  onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                  className="px-3 py-2 border rounded text-sm w-32"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Importo Max (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                  className="px-3 py-2 border rounded text-sm w-32"
                  placeholder="9999.99"
                />
              </div>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
              >
                Stampa Report
              </button>
            </div>

            {/* Sessions Table */}
            <div className="overflow-x-auto mb-6">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-blue-600 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase border">Inizio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase border">Fine</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase border">Conn.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase border">Roaming</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase border">Ricavo x kW</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase border">Ricavo x Ora</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase border">Ricavo Lordo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase border">Spese Incasso (1,5% + €0,25)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase border">Ricavo Netto</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-4 py-4 text-center text-gray-500">
                        Nessuna transazione trovata
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm border whitespace-nowrap">
                          {formatDate(session.startTime)}
                        </td>
                        <td className="px-4 py-3 text-sm border whitespace-nowrap">
                          {formatDate(session.endTime)}
                        </td>
                        <td className="px-4 py-3 text-sm border text-center">
                          {session.connectorId}
                        </td>
                        <td className="px-4 py-3 text-sm border text-center">
                          {session.roaming}
                        </td>
                        <td className="px-4 py-3 text-sm border">
                          {formatCurrency(session.revenuePerKwh)} x kW.{session.energyKwh.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm border">
                          {formatCurrency(session.revenuePerHour)}
                        </td>
                        <td className="px-4 py-3 text-sm border font-medium">
                          {formatCurrency(session.grossRevenue)}
                        </td>
                        <td className="px-4 py-3 text-sm border">
                          {formatCurrency(session.collectionFee)}
                        </td>
                        <td className="px-4 py-3 text-sm border font-medium">
                          {formatCurrency(session.netRevenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary Totals */}
            <div className="bg-gray-50 p-4 rounded border">
              <h4 className="font-bold mb-3">Riepilogo Totale</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Totale Ricariche</div>
                  <div className="font-bold text-lg">
                    {formatCurrency(filteredSessions.reduce((sum, s) => sum + s.grossRevenue, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Costo Mensile Piattaforma</div>
                  <div className="font-bold text-lg text-red-600">
                    {formatCurrency(-10.0)} {/* Placeholder - would come from subscription */}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Spese Incasso</div>
                  <div className="font-bold text-lg">
                    {formatCurrency(filteredSessions.reduce((sum, s) => sum + s.collectionFee, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Ricavo Netto</div>
                  <div className="font-bold text-lg text-green-600">
                    {formatCurrency(
                      filteredSessions.reduce((sum, s) => sum + s.netRevenue, 0) - 10.0
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
