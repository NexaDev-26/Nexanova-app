import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';
import api from '../utils/api';

// Import translation files
import enTranslations from '../locales/en.json';
import swTranslations from '../locales/sw.json';
import frTranslations from '../locales/fr.json';
import arTranslations from '../locales/ar.json';
import ptTranslations from '../locales/pt.json';

const LocaleContext = createContext();

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
};

// Language details
const LANGUAGES = {
  en: { name: 'English', nativeName: 'English', flag: '🇬🇧' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili', flag: '🇹🇿' },
  fr: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  pt: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  ar: { name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' }
};

// Currency mapping
const CURRENCIES = {
  TZS: { name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  UGX: { name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' },
  RWF: { name: 'Rwandan Franc', symbol: 'RFr', flag: '🇷🇼' },
  ETB: { name: 'Ethiopian Birr', symbol: 'Br', flag: '🇪🇹' },
  ZAR: { name: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  NGN: { name: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  GHS: { name: 'Ghanaian Cedi', symbol: '₵', flag: '🇬🇭' },
  USD: { name: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  EUR: { name: 'Euro', symbol: '€', flag: '🇪🇺' }
};

// Geolocation → Language/Currency map
const COUNTRY_CURRENCY_MAP = {
  TZ: 'TZS', KE: 'KES', UG: 'UGX', RW: 'RWF',
  ET: 'ETB', ZA: 'ZAR', NG: 'NGN', GH: 'GHS'
};

const COUNTRY_LANGUAGE_MAP = {
  TZ: 'sw', KE: 'sw', UG: 'en', RW: 'en',
  ET: 'en', ZA: 'en', NG: 'en', GH: 'en'
};

// System language detector
const detectSystemLanguage = () => {
  const lang = navigator.language.split('-')[0];
  return LANGUAGES[lang] ? lang : 'en';
};

const detectCurrencyFromCountry = (c) =>
  COUNTRY_CURRENCY_MAP[c] || 'TZS';

const detectLanguageFromCountry = (c) =>
  COUNTRY_LANGUAGE_MAP[c] || 'en';

// IP-based detection
const detectLocationByIP = async () => {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    return {
      country: data.country_code,
      city: data.city,
      region: data.region,
      currency: detectCurrencyFromCountry(data.country_code),
      language: detectLanguageFromCountry(data.country_code)
    };
  } catch {
    return null;
  }
};

// GPS-based detection
const detectLocationByGPS = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`
          );
          const data = await res.json();
          resolve({
            country: data.countryCode,
            city: data.city,
            region: data.principalSubdivision,
            currency: detectCurrencyFromCountry(data.countryCode),
            language: detectLanguageFromCountry(data.countryCode)
          });
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 5000 }
    );
  });

// MAIN PROVIDER
export const LocaleProvider = ({ children }) => {
  const [language, setLanguage] = useState(() =>
    localStorage.getItem('nexanova_language') || detectSystemLanguage()
  );

  const [currency, setCurrency] = useState(() =>
    localStorage.getItem('nexanova_currency') || 'TZS'
  );

  const [location, setLocation] = useState(null);
  const [detecting, setDetecting] = useState(false);

  // Auto-detect location
  const detectLocation = async () => {
    setDetecting(true);

    let data = await detectLocationByGPS();
    if (!data) data = await detectLocationByIP();

    if (data) {
      setLocation(data);

      if (!localStorage.getItem('nexanova_currency')) {
        setCurrency(data.currency);
        localStorage.setItem('nexanova_currency', data.currency);
      }

      if (!localStorage.getItem('nexanova_language')) {
        setLanguage(data.language);
        localStorage.setItem('nexanova_language', data.language);
      }
    }

    setDetecting(false);
  };

  // Load user preferences from backend
  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const res = await api.get('/user/profile');
        const user = res.data.user;

        if (user?.language) {
          setLanguage(user.language);
          localStorage.setItem('nexanova_language', user.language);
        }
        if (user?.currency) {
          setCurrency(user.currency);
          localStorage.setItem('nexanova_currency', user.currency);
        }
      } catch {}
    };
    loadPrefs();
  }, []);

  // Detect automatically if no prefs stored
  useEffect(() => {
    if (!localStorage.getItem('nexanova_language')) detectLocation();
  }, []);

  const updateLanguage = (lang) => {
    setLanguage(lang);
    localStorage.setItem('nexanova_language', lang);
    // Update backend if authenticated
    const token = localStorage.getItem('token');
    if (token) {
      api.patch('/user/profile', { language: lang }).catch(() => {});
    }
  };

  const updateCurrency = (curr) => {
    setCurrency(curr);
    localStorage.setItem('nexanova_currency', curr);
    api.patch('/user/preferences', { currency: curr }).catch(() => {});
  };

  const formatCurrency = (val) => {
    const info = CURRENCIES[currency] || CURRENCIES.TZS;
    return `${info.symbol} ${parseFloat(val).toLocaleString()}`;
  };

  // Translation mapping
  const translations = {
    en: enTranslations,
    sw: swTranslations,
    fr: frTranslations,
    ar: arTranslations,
    pt: ptTranslations
  };

  const t = useCallback(
    (key, params = {}) => {
      const keys = key.split('.');
      let value = translations[language];

      for (const k of keys) {
        value = value?.[k];
        if (value === undefined) {
          value = translations.en;
          for (const fallback of keys) value = value?.[fallback];
          break;
        }
      }

      if (typeof value === 'string') {
        return value.replace(/\{(\w+)\}/g, (_, p) => params[p] || p);
      }

      return value || key;
    },
    [language]
  );

  const contextValue = useMemo(
    () => ({
      language,
      currency,
      location,
      detecting,
      languages: LANGUAGES,
      currencies: CURRENCIES,
      updateLanguage,
      updateCurrency,
      formatCurrency,
      detectLocation,
      t
    }),
    [language, currency, location, detecting, t]
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      {children}
    </LocaleContext.Provider>
  );
};
