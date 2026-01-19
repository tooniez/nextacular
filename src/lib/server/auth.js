import { PrismaAdapter } from '@next-auth/prisma-adapter';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

import prisma from '@/prisma/index';
import { html, text } from '@/config/email-templates/signin';
import { emailConfig, sendMail } from '@/lib/server/mail';
import { createPaymentAccount, getPayment } from '@/prisma/services/customer';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token, user }) {
      if (session.user) {
        // Support both JWT (credentials) and database (email) sessions
        if (token?.id || token?.userId) {
          session.user.userId = token.id || token.userId;
          session.user.id = token.id || token.userId;
        } else if (user) {
          const customerPayment = await getPayment(user.email);
          session.user.userId = user.id;
          session.user.id = user.id;

          if (customerPayment) {
            session.user.subscription = customerPayment.subscriptionType;
          }
        }
      }
      return session;
    },
  },
  debug: !(process.env.NODE_ENV === 'production'),
  events: {
    signIn: async ({ user, isNewUser }) => {
      try {
        const customerPayment = await getPayment(user.email);

        if (isNewUser || customerPayment === null || user.createdAt === null) {
          // Only create payment account if Stripe is configured
          if (process.env.PAYMENTS_SECRET_KEY) {
            await Promise.all([createPaymentAccount(user.email, user.id)]);
          }
        }
      } catch (error) {
        // Don't block login if payment account creation fails
        console.error('[NextAuth] signIn event error:', error.message);
      }
    },
  },
  providers: [
    CredentialsProvider({
      name: 'Email & Password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const rawEmail = String(credentials?.email || '');
          const email = rawEmail.toLowerCase().trim();
          const domain = email.includes('@') ? email.split('@').slice(1).join('@') : null;
          const rawPassword = String(credentials?.password || '');
          const trimmedPassword = rawPassword.trim();

          // #region agent log
          fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'auth-creds',
              hypothesisId: 'H_AUTH_1',
              location: 'lib/server/auth.js',
              message: 'authorize enter',
              data: {
                hasEmail: Boolean(email),
                emailPrefix: email.slice(0, 3),
                emailDomain: domain,
                hasPassword: Boolean(credentials?.password),
                passwordLen: rawPassword.length,
                passwordTrimLen: trimmedPassword.length,
                passwordHadOuterWs: rawPassword !== trimmedPassword,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion

          if (!email || !rawPassword) {
            // #region agent log
            fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'auth-creds',
                hypothesisId: 'H_AUTH_1',
                location: 'lib/server/auth.js',
                message: 'authorize missing email/password',
                data: { hasEmail: Boolean(email), hasPassword: Boolean(credentials?.password) },
                timestamp: Date.now(),
              }),
            }).catch(() => {});
            // #endregion
            return null;
          }

          const user = await prisma.user.findUnique({ where: { email } });

          // #region agent log
          fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'auth-creds',
              hypothesisId: 'H_AUTH_2',
              location: 'lib/server/auth.js',
              message: 'authorize user lookup',
              data: { found: Boolean(user), hasPasswordHash: Boolean(user?.passwordHash), userIdPrefix: user?.id ? String(user.id).slice(0, 6) : null },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion

          if (!user?.passwordHash) {
            return null;
          }

          const okRaw = await bcrypt.compare(rawPassword, user.passwordHash);
          const okTrim = !okRaw && trimmedPassword !== rawPassword ? await bcrypt.compare(trimmedPassword, user.passwordHash) : false;
          const ok = okRaw || okTrim;

          // #region agent log
          fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'auth-creds',
              hypothesisId: 'H_AUTH_3',
              location: 'lib/server/auth.js',
              message: 'authorize password compare',
              data: { okRaw: Boolean(okRaw), okTrim: Boolean(okTrim), ok: Boolean(ok) },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion

          if (!ok) {
            return null;
          }

          return { id: user.id, email: user.email, name: user.name };
        } catch (e) {
          // #region agent log
          fetch('http://localhost:7242/ingest/63d3e4d3-5a4a-4343-8839-58d002db9a84', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: 'debug-session',
              runId: 'auth-creds',
              hypothesisId: 'H_AUTH_4',
              location: 'lib/server/auth.js',
              message: 'authorize exception',
              data: { err: e?.message ? String(e.message).slice(0, 120) : 'unknown' },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          return null;
        }
      },
    }),
    EmailProvider({
      from: process.env.EMAIL_FROM,
      server: emailConfig,
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const { host } = new URL(url);
        await sendMail({
          html: html({ email, url }),
          subject: `[Nextacular] Sign in to ${host}`,
          text: text({ email, url }),
          to: email,
        });
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || null,
  session: {
    strategy: 'jwt', // Use JWT for both providers
  },
  pages: {
    signIn: '/auth/login',
  },
  // Ensure NextAuth uses the correct base URL
  baseUrl: process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000',
};
