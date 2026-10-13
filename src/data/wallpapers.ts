import { ChatWallpaper } from '../types/telegram';

export const SOLID_WALLPAPERS: ChatWallpaper[] = [
  {
    id: 'solid_classic_dark',
    name: 'کلاسیک شب تلگرام',
    type: 'solid',
    value: '#0e1621',
    hasPattern: true
  },
  {
    id: 'solid_pure_black',
    name: 'مشکی عمیق ابسیدین',
    type: 'solid',
    value: '#080c14',
    hasPattern: true
  },
  {
    id: 'solid_slate_charcoal',
    name: 'زغالی سنگی مات',
    type: 'solid',
    value: '#17212b',
    hasPattern: true
  },
  {
    id: 'solid_emerald_dark',
    name: 'سبز تیره زمردی',
    type: 'solid',
    value: '#09211a',
    hasPattern: true
  },
  {
    id: 'solid_royal_violet',
    name: 'بنفش امپراتوری',
    type: 'solid',
    value: '#160c29',
    hasPattern: true
  },
  {
    id: 'solid_ocean_navy',
    name: 'سرمه‌ای عمیق اقیانوس',
    type: 'solid',
    value: '#0a192e',
    hasPattern: true
  },
  {
    id: 'solid_mocha_espresso',
    name: 'شکلاتی موکا',
    type: 'solid',
    value: '#1c130d',
    hasPattern: true
  },
  {
    id: 'solid_velvet_burgundy',
    name: 'شرابی مخملی شب',
    type: 'solid',
    value: '#230b15',
    hasPattern: true
  }
];

export const GRADIENT_WALLPAPERS: ChatWallpaper[] = [
  {
    id: 'grad_cyberpunk',
    name: 'نئون سایبرپانک',
    type: 'gradient',
    value: 'linear-gradient(135deg, #180b2b 0%, #2e0f4a 40%, #50104e 70%, #1a0826 100%)',
    hasPattern: true
  },
  {
    id: 'grad_aurora',
    name: 'شفق قطبی شمالگان',
    type: 'gradient',
    value: 'linear-gradient(135deg, #061e2b 0%, #0c3b38 45%, #0e5a4e 75%, #051d18 100%)',
    hasPattern: true
  },
  {
    id: 'grad_cosmic',
    name: 'سحابی کیهانی ژرف',
    type: 'gradient',
    value: 'linear-gradient(135deg, #0a0b16 0%, #171836 40%, #2e1c54 80%, #0d0a1c 100%)',
    hasPattern: true
  },
  {
    id: 'grad_pacific',
    name: 'اقیانوس آرام نیمه‌شب',
    type: 'gradient',
    value: 'linear-gradient(135deg, #051923 0%, #003554 45%, #006494 85%, #051923 100%)',
    hasPattern: true
  },
  {
    id: 'grad_sunset',
    name: 'سراب غروب صحرا',
    type: 'gradient',
    value: 'linear-gradient(135deg, #2b0e14 0%, #461619 40%, #612918 75%, #1f080b 100%)',
    hasPattern: true
  },
  {
    id: 'grad_emerald_glow',
    name: 'نئون زمردین درخشان',
    type: 'gradient',
    value: 'linear-gradient(135deg, #021c15 0%, #054534 45%, #0c6d50 80%, #021912 100%)',
    hasPattern: true
  },
  {
    id: 'grad_twilight',
    name: 'گرگ‌ومیش اشرافی',
    type: 'gradient',
    value: 'linear-gradient(135deg, #1b0c2e 0%, #35175d 45%, #56218c 80%, #140824 100%)',
    hasPattern: true
  },
  {
    id: 'grad_solar',
    name: 'زبانه آتشفشانی خورشید',
    type: 'gradient',
    value: 'linear-gradient(135deg, #270909 0%, #49140a 45%, #6d2a0b 80%, #1f0707 100%)',
    hasPattern: true
  }
];

export const DEFAULT_WALLPAPER: ChatWallpaper = SOLID_WALLPAPERS[0];
