import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import type { AssistantDeckContext } from '../types.ts';
import {
  CHATKIT_API_URL,
  CHATKIT_DOMAIN_KEY,
  CHATKIT_GREETING,
  CHATKIT_PLACEHOLDER,
  CHATKIT_SESSION_URL,
  CHATKIT_STARTER_PROMPTS,
  CHATKIT_WORKFLOW_ID,
  chatKitTheme,
  isCustomChatKitConfigured,
  isHostedChatKitConfigured,
} from '../lib/chatkit';

interface ChatKitPanelProps {
  assistantContext: AssistantDeckContext;
}

const USER_ID_KEY = 'chatkit-user-id';

const getOrCreateUserId = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const existing = window.localStorage.getItem(USER_ID_KEY);
    if (existing) {
      return existing;
    }
    const generated = crypto.randomUUID();
    window.localStorage.setItem(USER_ID_KEY, generated);
    return generated;
  } catch {
    return crypto.randomUUID?.() ?? String(Date.now());
  }
};

type ApiOptions =
  | {
      api: {
        getClientSecret: (current: string | null) => Promise<string>;
      };
    }
  | {
      api: {
        url: string;
        domainKey: string;
      };
    };

const MissingConfigNotice = () => (
  <div className="rounded-[28px] border border-dashed border-white/15 bg-black/40 p-4 text-sm text-slate-200">
    <p className="font-semibold">Chat assistant is not configured.</p>
    <p className="mt-2 text-xs text-slate-400">
      Set <code className="text-[11px]">VITE_CHATKIT_SESSION_URL</code> +{' '}
      <code className="text-[11px]">VITE_CHATKIT_WORKFLOW_ID</code> for OpenAI-hosted workflows, or{' '}
      <code className="text-[11px]">VITE_CHATKIT_API_URL</code> + <code className="text-[11px]">VITE_CHATKIT_DOMAIN_KEY</code>{' '}
      to target a self-hosted ChatKit server. Rebuild the app after updating the values.
    </p>
  </div>
);

export function ChatKitPanel({ assistantContext }: ChatKitPanelProps) {
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isInitializingSession, setIsInitializingSession] = useState(isHostedChatKitConfigured);
  const [isScriptReady, setIsScriptReady] = useState(() =>
    typeof window !== 'undefined' ? Boolean(window.customElements?.get('openai-chatkit')) : false,
  );
  const [userId] = useState<string | null>(() => getOrCreateUserId());

  useEffect(() => {
    if (typeof window === 'undefined' || isScriptReady) {
      return;
    }
    let active = true;
    window.customElements?.whenDefined('openai-chatkit').then(() => {
      if (active) {
        setIsScriptReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [isScriptReady]);

  useEffect(() => {
    if (!isHostedChatKitConfigured) {
      setIsInitializingSession(false);
    }
  }, [isHostedChatKitConfigured]);

  const getClientSecret = useCallback(
    async (currentSecret: string | null) => {
      if (!CHATKIT_SESSION_URL || !CHATKIT_WORKFLOW_ID) {
        throw new Error('ChatKit session endpoint is not configured.');
      }

      try {
        const response = await fetch(CHATKIT_SESSION_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflow: { id: CHATKIT_WORKFLOW_ID,           
              state_variables: { 
                points_cap: assistantContext?.points_cap,
                total_points: assistantContext?.total_points,
                points_remaining: assistantContext?.points_remaining,
                deck_goal: assistantContext?.deck_goal ?? "",
                deck_cards: assistantContext?.deck_cards,
                card_point_list: assistantContext?.card_point_list
              }},
            user: userId,
            chatkit_configuration: {
              file_upload: { enabled: false },
            },
          }),
        });

        const payload = (await response.json().catch(() => null)) as
          | {
              client_secret?: string;
              clientSecret?: string;
              error?: string;
              details?: string | { error?: string };
            }
          | null;

        if (!response.ok) {
          const detail =
            payload?.error ??
            (typeof payload?.details === 'string'
              ? payload.details
              : typeof payload?.details === 'object'
              ? payload.details?.error
              : null) ??
            `Unable to create session (${response.status})`;
          throw new Error(detail);
        }

        const secret = payload?.client_secret ?? payload?.clientSecret;
        if (!secret) {
          throw new Error('Session endpoint did not return a client_secret.');
        }
        return secret;
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unable to create ChatKit session.';
        setSessionError(detail);
        throw error instanceof Error ? error : new Error(detail);
      } finally {
        if (!currentSecret) {
          setIsInitializingSession(false);
        }
      }
    },
    [assistantContext, userId],
  );

  const apiOptions: ApiOptions | null = useMemo(() => {
    if (isHostedChatKitConfigured) {
      return { api: { getClientSecret } };
    }
    if (isCustomChatKitConfigured && CHATKIT_API_URL && CHATKIT_DOMAIN_KEY) {
      return {
        api: {
          url: CHATKIT_API_URL,
          domainKey: CHATKIT_DOMAIN_KEY,
        },
      };
    }
    return null;
  }, [CHATKIT_API_URL, CHATKIT_DOMAIN_KEY, getClientSecret, isCustomChatKitConfigured, isHostedChatKitConfigured]);

  if (!apiOptions) {
    return <MissingConfigNotice />;
  }

  const chatkit = useChatKit({
    ...apiOptions,
    theme: chatKitTheme('dark'),
    startScreen: {
      greeting: CHATKIT_GREETING,
      prompts: CHATKIT_STARTER_PROMPTS,
    },
    composer: {
      placeholder: CHATKIT_PLACEHOLDER,
    },
    threadItemActions: {
      feedback: false,
    },
    onResponseEnd: () => {
      setSessionError(null);
    },
    onError: ({ error }) => {
      console.error('ChatKit error', error);
    },
  });

  const overlayMessage = useMemo(() => {
    if (sessionError) {
      return sessionError;
    }
    if (!isScriptReady) {
      return 'Loading assistant...';
    }
    if (isHostedChatKitConfigured && isInitializingSession) {
      return 'Starting assistant session...';
    }
    return null;
  }, [isHostedChatKitConfigured, isInitializingSession, isScriptReady, sessionError]);

  return (
    <div className="flex h-full min-h-[520px] flex-col">
      <ChatKit
          control={chatkit.control}
          className={`h-full w-full ${overlayMessage ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
        />
        {overlayMessage && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-300">
            {overlayMessage}
          </div>
        )}
    </div>
  );
}
