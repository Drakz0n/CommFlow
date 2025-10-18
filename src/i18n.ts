/**
 * i18n Configuration
 * Sets up react-i18next for multi-language support.
 * Loads translations, detects language preference, and provides fallback to English.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enClients from './locales/en/clients.json';
import enCommissions from './locales/en/commissions.json';
import enConfig from './locales/en/config.json';
import enImageViewer from './locales/en/imageViewer.json';

import esCommon from './locales/es/common.json';
import esDashboard from './locales/es/dashboard.json';
import esClients from './locales/es/clients.json';
import esCommissions from './locales/es/commissions.json';
import esConfig from './locales/es/config.json';
import esImageViewer from './locales/es/imageViewer.json';

import deCommon from './locales/de/common.json';
import deDashboard from './locales/de/dashboard.json';
import deClients from './locales/de/clients.json';
import deCommissions from './locales/de/commissions.json';
import deConfig from './locales/de/config.json';
import deImageViewer from './locales/de/imageViewer.json';

// Configure i18next
i18n
  .use(initReactI18next) // Bind react-i18next to the i18next instance
  .init({
    // Translation resources organized by language and namespace
    resources: {
      en: {
        common: enCommon,
        dashboard: enDashboard,
        clients: enClients,
        commissions: enCommissions,
        config: enConfig,
        imageViewer: enImageViewer,
      },
      es: {
        common: esCommon,
        dashboard: esDashboard,
        clients: esClients,
        commissions: esCommissions,
        config: esConfig,
        imageViewer: esImageViewer,
      },
      de: {
        common: deCommon,
        dashboard: deDashboard,
        clients: deClients,
        commissions: deCommissions,
        config: deConfig,
        imageViewer: deImageViewer,
      },
    },
    
    // Default language (will be overridden by SettingsContext)
    lng: 'en',
    
    // Fallback language if translation key is missing
    fallbackLng: 'en',
    
    // Default namespace to use if not specified
    defaultNS: 'common',
    
    // Namespaces to load by default
    ns: ['common', 'dashboard', 'clients', 'commissions', 'config'],
    
    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Development settings
    debug: false, // Set to true for debugging translation keys
    
    // React-specific options
    react: {
      useSuspense: false, // Disable suspense to avoid loading flicker
    },
  });

export default i18n;
