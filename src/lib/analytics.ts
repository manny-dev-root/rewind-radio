import posthog from 'posthog-js';

/**
 * Registra un evento personalizado en PostHog de forma segura (sin errores si no está configurado).
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  try {
    if (typeof window !== 'undefined' && posthog.__loaded) {
      posthog.capture(eventName, properties);
    }
  } catch {}
}
