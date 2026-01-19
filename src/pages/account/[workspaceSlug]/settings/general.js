import { useEffect, useState } from 'react';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { getSession } from 'next-auth/react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isSlug from 'validator/lib/isSlug';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { getWorkspace, isWorkspaceOwner } from '@/prisma/services/workspace';
import { useTranslation } from "react-i18next";

const General = ({ isTeamOwner, workspace }) => {
  const router = useRouter();
  const { setWorkspace } = useWorkspace();
  const { t } = useTranslation();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [name, setName] = useState(workspace?.name || '');
  const [slug, setSlug] = useState(workspace?.slug || '');
  const [contactWebsiteUrl, setContactWebsiteUrl] = useState(workspace?.contactWebsiteUrl || '');
  const [contactEmail, setContactEmail] = useState(workspace?.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(workspace?.contactPhone || '');
  const [brandLogoUrl, setBrandLogoUrl] = useState(workspace?.brandLogoUrl || '');
  const [logoUploadBusy, setLogoUploadBusy] = useState(false);
  const validName = name.length > 0 && name.length <= 16;
  const validSlug =
    slug.length > 0 &&
    slug.length <= 16 &&
    isSlug(slug) &&
    isAlphanumeric(slug, undefined, { ignore: '-' });

  const changeName = (event) => {
    event.preventDefault();
    if (!workspace?.slug) {
      toast.error('Workspace not loaded');
      return;
    }
    setSubmittingState(true);
    api(`/api/workspace/${workspace.slug}/name`, {
      body: { name },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Workspace name successfully updated!');
      }
    });
  };

  const changeSlug = (event) => {
    event.preventDefault();
    if (!workspace?.slug) {
      toast.error('Workspace not loaded');
      return;
    }
    setSubmittingState(true);
    api(`/api/workspace/${workspace.slug}/slug`, {
      body: { slug },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);
      const slug = response?.data?.slug;

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Workspace slug successfully updated!');
        router.replace(`/account/${slug}/settings/general`);
      }
    });
  };

  const copyToClipboard = () => toast.success('Copied to clipboard!');

  const handleNameChange = (event) => setName(event.target.value);

  const handleSlugChange = (event) => setSlug(event.target.value);

  const uploadLogoFile = async (file) => {
    if (!workspace?.slug) {
      toast.error('Workspace not loaded');
      return;
    }
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) {
      toast.error('Formato non supportato. Usa PNG/JPG/WEBP.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error('File troppo grande (max 4MB).');
      return;
    }

    setLogoUploadBusy(true);
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('read error'));
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });

      // #region agent log
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'post-fix',
          hypothesisId: 'H1',
          location: 'src/pages/account/[workspaceSlug]/settings/general.js',
          message: 'Uploading workspace logo file',
          data: { type: file.type, size: file.size },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      const response = await api(`/api/workspace/${workspace.slug}/logo`, {
        method: 'PUT',
        body: { logoDataUrl: dataUrl },
      });
      const ws = response?.data?.workspace;

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        const nextUrl = ws?.brandLogoUrl || '';
        setBrandLogoUrl(nextUrl);
        if (ws) setWorkspace({ ...(workspace || {}), ...ws });
        toast.success('Logo caricato!');
      }
    } catch (e) {
      toast.error('Upload logo fallito');
    } finally {
      setLogoUploadBusy(false);
    }
  };

  const removeLogo = async () => {
    if (!workspace?.slug) return;
    setLogoUploadBusy(true);
    try {
      const response = await api(`/api/workspace/${workspace.slug}/logo`, {
        method: 'PUT',
        body: { logoDataUrl: null },
      });
      const ws = response?.data?.workspace;
      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        setBrandLogoUrl('');
        if (ws) setWorkspace({ ...(workspace || {}), ...ws });
        toast.success('Logo rimosso');
      }
    } catch {
      toast.error('Rimozione logo fallita');
    } finally {
      setLogoUploadBusy(false);
    }
  };

  const changeContact = (event) => {
    event.preventDefault();
    if (!workspace?.slug) {
      toast.error('Workspace not loaded');
      return;
    }
    setSubmittingState(true);

    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'src/pages/account/[workspaceSlug]/settings/general.js',
        message: 'Saving workspace contact info',
        data: { hasWebsite: !!contactWebsiteUrl, hasEmail: !!contactEmail, hasPhone: !!contactPhone },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    api(`/api/workspace/${workspace.slug}/contact`, {
      body: { contactWebsiteUrl, contactEmail, contactPhone, brandLogoUrl },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);
      const ws = response?.data?.workspace;

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Contact info successfully updated!');
        if (ws) setWorkspace(ws);
      }
    });
  };

  useEffect(() => {
    // #region agent log
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'src/pages/account/[workspaceSlug]/settings/general.js',
        message: 'General settings effect: workspace changed',
        data: { hasWorkspace: !!workspace, slug: workspace?.slug || null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion

    if (!workspace) return;
    setName(workspace.name || '');
    setSlug(workspace.slug || '');
    setContactWebsiteUrl(workspace.contactWebsiteUrl || '');
    setContactEmail(workspace.contactEmail || '');
    setContactPhone(workspace.contactPhone || '');
    setBrandLogoUrl(workspace.brandLogoUrl || '');
    setWorkspace(workspace);
  }, [workspace, setWorkspace]);

  if (!workspace) {
    return (
      <AccountLayout>
        <Meta title="Nextacular - Settings" />
        <Content.Title title={t("settings.workspace.information")} subtitle="Workspace not found" />
        <Content.Divider />
        <Content.Container>
          <Card>
            <Card.Body>
              <div className="text-sm text-gray-600">
                Workspace non trovato o accesso non autorizzato. Torna alla dashboard e riprova.
              </div>
            </Card.Body>
          </Card>
        </Content.Container>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout>
      <Meta title={`Nextacular - ${workspace?.name || 'Workspace'} | Settings`} />
      <Content.Title
        title={t("settings.workspace.information")}
        subtitle={t("settings.general.workspace.description")}
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body
            title={t("workspace.action.name.label")}
            subtitle={t("settings.workspace.name.description")}
          >
            <input
              className="px-3 py-2 border rounded md:w-1/2"
              disabled={isSubmitting || !isTeamOwner}
              onChange={handleNameChange}
              type="text"
              value={name}
            />
          </Card.Body>
          <Card.Footer>
            <small>Please use 16 characters at maximum</small>
            {isTeamOwner && (
              <Button
                className="text-white bg-blue-600 hover:bg-blue-500"
                disabled={!validName || isSubmitting}
                onClick={changeName}
              >
                Save
              </Button>
            )}
          </Card.Footer>
        </Card>
        <Card>
          <Card.Body
            title="Branding & Contatti Sub‑CPO"
            subtitle="Queste informazioni verranno mostrate nella scheda informativa della colonnina e nel menu"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <label className="block text-sm font-medium mb-1">Logo (URL immagine)</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  disabled={isSubmitting || logoUploadBusy || !isTeamOwner}
                  onChange={(e) => setBrandLogoUrl(e.target.value)}
                  type="text"
                  placeholder="https://.../logo.png"
                  value={brandLogoUrl}
                />
                <div className="mt-2 text-xs text-gray-500">
                  Consiglio: PNG/SVG con sfondo trasparente.
                </div>
                <div className="mt-3 flex flex-col md:flex-row md:items-center gap-3">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isSubmitting || logoUploadBusy || !isTeamOwner}
                    onChange={(e) => uploadLogoFile(e.target.files?.[0])}
                  />
                  <Button
                    className="border border-gray-300"
                    disabled={isSubmitting || logoUploadBusy || !isTeamOwner || !brandLogoUrl}
                    onClick={removeLogo}
                  >
                    Rimuovi logo
                  </Button>
                  {logoUploadBusy && <span className="text-sm text-gray-500">Caricamento...</span>}
                </div>
                {brandLogoUrl && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">Anteprima</div>
                    <img
                      src={brandLogoUrl}
                      alt="Logo preview"
                      className="h-10 max-w-[260px] object-contain border rounded bg-white p-1"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sito web</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  disabled={isSubmitting || !isTeamOwner}
                  onChange={(e) => setContactWebsiteUrl(e.target.value)}
                  type="text"
                  placeholder="https://azienda.it"
                  value={contactWebsiteUrl}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  disabled={isSubmitting || !isTeamOwner}
                  onChange={(e) => setContactEmail(e.target.value)}
                  type="email"
                  placeholder="info@azienda.it"
                  value={contactEmail}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefono</label>
                <input
                  className="w-full px-3 py-2 border rounded"
                  disabled={isSubmitting || !isTeamOwner}
                  onChange={(e) => setContactPhone(e.target.value)}
                  type="text"
                  placeholder="+39 ..."
                  value={contactPhone}
                />
              </div>
            </div>
          </Card.Body>
          <Card.Footer>
            <small>Campi opzionali</small>
            {isTeamOwner && (
              <Button
                className="text-white bg-blue-600 hover:bg-blue-500"
                disabled={isSubmitting}
                onClick={changeContact}
              >
                Save
              </Button>
            )}
          </Card.Footer>
        </Card>
        <Card>
          <Card.Body
            title={t("settings.workspace.slug")}
            subtitle={t("setting.workspace.slug.description")}
          >
            <div className="flex items-center space-x-3">
              <input
                className="px-3 py-2 border rounded md:w-1/2"
                disabled={isSubmitting || !isTeamOwner}
                onChange={handleSlugChange}
                type="text"
                value={slug}
              />
              <span className={`text-sm ${slug.length > 16 && 'text-red-600'}`}>
                {slug.length} / 16
              </span>
            </div>
          </Card.Body>
          <Card.Footer>
            <small>
              {t("settings.workspace.slug.validation.message")}
            </small>
            {isTeamOwner && (
              <Button
                className="text-white bg-blue-600 hover:bg-blue-500"
                disabled={!validSlug || isSubmitting}
                onClick={changeSlug}
              >
                {t("common.label.save")}
              </Button>
            )}
          </Card.Footer>
        </Card>
        <Card>
          <Card.Body
            title={t("settings.workspace.slug.validation.message")}
            subtitle={t("settings.workspace.id.description")}
          >
            <div className="flex items-center justify-between px-3 py-2 space-x-5 font-mono text-sm border rounded md:w-1/2">
              <span className="overflow-x-auto">{workspace.workspaceCode}</span>
              <CopyToClipboard
                onCopy={copyToClipboard}
                text={workspace.workspaceCode}
              >
                <DocumentDuplicateIcon className="w-5 h-5 cursor-pointer hover:text-blue-600" />
              </CopyToClipboard>
            </div>
          </Card.Body>
        </Card>
      </Content.Container>
    </AccountLayout>
  );
};

export const getServerSideProps = async (context) => {
  const session = await getSession(context);
  let isTeamOwner = false;
  let workspace = null;

  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'src/pages/account/[workspaceSlug]/settings/general.js',
        message: 'GSSP start (general settings)',
        data: { hasSession: !!session, workspaceSlug: context?.params?.workspaceSlug || null },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  if (session) {
    // prisma/services/workspace.getWorkspace expects (slug)
    const ws = await getWorkspace(context.params.workspaceSlug);

    if (ws) {
      isTeamOwner = await isWorkspaceOwner(
        session.user.userId,
        session.user.email,
        context.params.workspaceSlug
      );

      // IMPORTANT: Next.js requires JSON-serializable props.
      // Prisma returns Date objects (e.g., createdAt), which break serialization.
      workspace = {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        workspaceCode: ws.workspaceCode,
        inviteCode: ws.inviteCode,
        isActive: ws.isActive,
        isSuspended: ws.isSuspended,
        contactWebsiteUrl: ws.contactWebsiteUrl || null,
        contactEmail: ws.contactEmail || null,
        contactPhone: ws.contactPhone || null,
        brandLogoUrl: ws.brandLogoUrl || null,
      };
    }
  }

  // #region agent log
  try {
    fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'post-fix',
        hypothesisId: 'H1',
        location: 'src/pages/account/[workspaceSlug]/settings/general.js',
        message: 'GSSP resolved workspace',
        data: { workspaceFound: !!workspace, isTeamOwner },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch {}
  // #endregion

  return {
    props: {
      isTeamOwner,
      workspace,
    },
  };
};

export default General;
