import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocale } from 'services/remote'

import zh from 'locales/zh.json'
import agreementUsZh from 'locales/agreement-us-zh.json'
import agreementNonUsZh from 'locales/agreement-non-us-zh.json'
import en from 'locales/en.json'
import agreementUsEn from 'locales/agreement-us-en.json'
import agreementNonUsEn from 'locales/agreement-non-us-en.json'

const locale = getLocale()
const lng = ['zh', 'zh-CN'].includes(locale) ? 'zh' : 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: { ...en, ...agreementUsEn, ...agreementNonUsEn } },
    zh: { translation: { ...zh, ...agreementUsZh, ...agreementNonUsZh } },
  },
  fallbackLng: lng,
  interpolation: {
    escapeValue: false,
  },
})

export default i18n
