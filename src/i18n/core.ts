// Core strings used at boot (loading, errors). Features add their own.

import { registerStrings } from './strings';

registerStrings({
  ar: {
    appName: 'أطلس خطوط الصدع',
    appTag: 'الجغرافيا السياسية والعرقية والدينية للعالم',
    loading: 'جارٍ تحميل الأطلس…',
    loadingFile: 'تحميل {name}',
    loadFailed: 'تعذّر تحميل بيانات الأطلس. تحقّق من الاتصال ثم أعد المحاولة.',
    retry: 'أعد المحاولة',
    noData: 'لا تتوفّر بيانات',
    close: 'إغلاق',
  },
  en: {
    appName: 'Fault Lines Atlas',
    appTag: 'The political, ethnic and religious geography of the world',
    loading: 'Loading the atlas…',
    loadingFile: 'Loading {name}',
    loadFailed: 'The atlas data did not load. Check the connection and try again.',
    retry: 'Try again',
    noData: 'No data',
    close: 'Close',
  },
});
