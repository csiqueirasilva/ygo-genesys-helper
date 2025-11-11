import type { StartScreenPrompt, ThemeOption } from '@openai/chatkit';

const env = import.meta.env;

const trimEnv = (value: string | undefined) => value?.trim() ?? '';

export const CHATKIT_SESSION_URL = trimEnv(env.VITE_CHATKIT_SESSION_URL);
export const CHATKIT_WORKFLOW_ID = trimEnv(env.VITE_CHATKIT_WORKFLOW_ID);
export const CHATKIT_API_URL = trimEnv(env.VITE_CHATKIT_API_URL);
export const CHATKIT_DOMAIN_KEY = trimEnv(env.VITE_CHATKIT_DOMAIN_KEY);

export const CHATKIT_GREETING = 'Need a second opinion on this Genesys deck?';
export const CHATKIT_PLACEHOLDER = 'Ask the Genesys assistant anything...';

export const CHATKIT_STARTER_PROMPTS: StartScreenPrompt[] = [
  {
    label: 'Spot high-point cards',
    prompt: 'Which cards in this deck consume the most Genesys points?',
    icon: 'chart',
  },
  {
    label: 'Trim to cap',
    prompt: 'Suggest swaps so the deck stays within the Genesys point cap.',
    icon: 'sparkle',
  },
  {
    label: 'Side deck help',
    prompt: 'How can I adjust the side deck to cover common Genesys threats?',
    icon: 'notebook',
  },
];

export const chatKitTheme = (colorScheme: 'dark' | 'light' = 'dark'): ThemeOption => ({
  colorScheme,
  color: {
    grayscale: {
      hue: 215,
      tint: 5,
      shade: colorScheme === 'dark' ? -1 : -4,
    },
    accent: {
      primary: '#fbbf24',
      level: 1,
    },
  },
  radius: 'round',
});

export const isHostedChatKitConfigured =
  Boolean(CHATKIT_SESSION_URL) && Boolean(CHATKIT_WORKFLOW_ID);

export const isCustomChatKitConfigured =
  Boolean(CHATKIT_API_URL) && Boolean(CHATKIT_DOMAIN_KEY);
