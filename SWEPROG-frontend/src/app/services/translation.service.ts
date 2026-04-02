import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'sv' | 'en' | 'ar';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private currentLanguageSubject = new BehaviorSubject<Language>('sv');
  public currentLanguage$ = this.currentLanguageSubject.asObservable();
  
  private translations: { [key in Language]: any } = {
    sv: {},
    en: {},
    ar: {}
  };

  constructor() {
    this.loadTranslations('sv');
  }

  async loadTranslations(lang: Language): Promise<void> {
    try {
      const response = await fetch(`/assets/translation/${lang}.json`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.translations[lang] = data;
      this.currentLanguageSubject.next(lang);
      
      // Uppdatera RTL-stöd för arabiska
      if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
      } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = lang;
      }
      
      // Ta bort denna console.log
      // console.log(`✅ Språk laddat: ${lang}`, Object.keys(data).length, 'nycklar');
    } catch (error) {
      // Ta bort eller kommentera ut denna
      // console.error(`❌ Kunde inte ladda ${lang}.json:`, error);
    }
  }

  setLanguage(lang: Language): void {
    if (this.translations[lang] && Object.keys(this.translations[lang]).length > 0) {
      this.currentLanguageSubject.next(lang);
      
      if (lang === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
      } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = lang;
      }
      
      // Ta bort denna console.log
      // console.log(`✅ Språk ändrat till: ${lang}`);
    } else {
      this.loadTranslations(lang);
    }
  }

  get currentLanguage(): Language {
    return this.currentLanguageSubject.value;
  }

  translate(key: string): string {
    const lang = this.currentLanguage;
    const keys = key.split('.');
    let value = this.translations[lang];
    
    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Ta bort eller kommentera ut varningarna om du vill ha HELT tyst
        // console.warn(`⚠️ Översättning saknas: ${key} för ${lang}`);
        return key;
      }
    }
    
    return typeof value === 'string' ? value : String(value);
  }

  instant(key: string): string {
    return this.translate(key);
  }
}