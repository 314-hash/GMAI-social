import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';

export default {
  targets: [
    {
      name: 'mobile-viewport',
      engine: web({
        viewport: { width: 390, height: 844 },
      }),
      app: {
        url: 'http://localhost:5173',
      },
    },
  ],
} satisfies E2EConfig;
