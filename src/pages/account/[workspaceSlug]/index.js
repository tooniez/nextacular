import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const Workspace = () => {
  const router = useRouter();
  const { workspace } = useWorkspace();

  useEffect(() => {
    const slug = workspace?.slug || router.query.workspaceSlug;
    if (!slug) return;
    if (router.asPath === `/account/${slug}` || router.pathname === '/account/[workspaceSlug]') {
      // #region agent log
      fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H1',
          location: 'src/pages/account/[workspaceSlug]/index.js',
          message: 'Redirecting workspace root to dashboard',
          data: { hasWorkspace: !!workspace, workspaceSlug: slug, asPath: router.asPath },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      router.replace(`/account/${slug}/dashboard`).catch(() => {});
    }
  }, [router, workspace]);

  return (
    workspace && (
      <AccountLayout>
        <Meta title={`Nextacular - ${workspace.name} | Dashboard`} />
        <Content.Title
          title={workspace.name}
          subtitle="This is your project's workspace"
        />
        <Content.Divider />
        <Content.Container />
      </AccountLayout>
    )
  );
};

export default Workspace;
