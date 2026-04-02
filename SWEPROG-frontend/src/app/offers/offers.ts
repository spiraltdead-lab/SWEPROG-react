import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { TranslationService } from '../services/translation.service';

export interface Offer {
  id: number;
  icon: string;
  titleKey: string;
  descriptionKey: string;
  detailsKey: string;
  price: number;
  priceUnit: string;
  originalPrice?: number;
  discount?: number;
  featureKeys: string[];
  highlight?: boolean;
  badgeKey?: string;
  ctaKey: string;
}

@Component({
  selector: 'app-offers',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './offers.html',
  styleUrls: ['./offers.css']
})
export class OffersComponent implements OnInit {
  
  selectedModalOffer: Offer | null = null;

  offers: Offer[] = [
    {
      id: 1,
      icon: '🌐',
      titleKey: 'offers.items.webbstart.title',
      descriptionKey: 'offers.items.webbstart.description',
      detailsKey: 'offers.items.webbstart.details',
      price: 99,
      originalPrice: 199,
      discount: Math.round((1 - (99 / 199)) * 100), // Automatically calculate discount
      priceUnit: 'offers.priceUnit.month',
      featureKeys: [
        'offers.items.webbstart.features.responsive',
        'offers.items.webbstart.features.pages',
        'offers.items.webbstart.features.contact',
        'offers.items.webbstart.features.seo',
        'offers.items.webbstart.features.support',
        'offers.items.webbstart.features.ssl'
      ],
      ctaKey: 'offers.cta.select'
    },
    {
      id: 2,
      icon: '⚙️',
      titleKey: 'offers.items.business.title',
      descriptionKey: 'offers.items.business.description',
      detailsKey: 'offers.items.business.details',
      price: 349,
      originalPrice: 899,
      discount: Math.round((1 - (349 / 899)) * 100), // Automatically calculate discount
      priceUnit: 'offers.priceUnit.month',
      featureKeys: [
        'offers.items.business.features.crm',
        'offers.items.business.features.unlimited',
        'offers.items.business.features.search',
        'offers.items.business.features.booking',
        'offers.items.business.features.email',
        'offers.items.business.features.analytics',
        'offers.items.business.features.support',
        'offers.items.business.features.report'
      ],
      highlight: true,
      badgeKey: 'offers.badges.popular',
      ctaKey: 'offers.cta.select'
    },
    {
      id: 3,
      icon: '🛒',
      titleKey: 'offers.items.ecommerce.title',
      descriptionKey: 'offers.items.ecommerce.description',
      detailsKey: 'offers.items.ecommerce.details',
      price: 479,
      originalPrice: 1699,
      discount: Math.round((1 - (479 / 1699)) * 100), // Automatically calculate discount
      priceUnit: 'offers.priceUnit.month',
      featureKeys: [
        'offers.items.ecommerce.features.products',
        'offers.items.ecommerce.features.payment',
        'offers.items.ecommerce.features.inventory',
        'offers.items.ecommerce.features.orders',
        'offers.items.ecommerce.features.discounts',
        'offers.items.ecommerce.features.invoicing',
        'offers.items.ecommerce.features.seo',
        'offers.items.ecommerce.features.support'
      ],
      ctaKey: 'offers.cta.select'
    },
    {
      id: 4,
      icon: '🏢',
      titleKey: 'offers.items.enterprise.title',
      descriptionKey: 'offers.items.enterprise.description',
      detailsKey: 'offers.items.enterprise.details',
      price: 899,
      originalPrice: 2399,
      discount: Math.round((1 - (899 / 2399)) * 100), // Automatically calculate discount

      priceUnit: 'offers.priceUnit.month',
      featureKeys: [
        'offers.items.enterprise.features.custom',
        'offers.items.enterprise.features.api',
        'offers.items.enterprise.features.sso',
        'offers.items.enterprise.features.permissions',
        'offers.items.enterprise.features.dedicated',
        'offers.items.enterprise.features.sla',
        'offers.items.enterprise.features.pm',
        'offers.items.enterprise.features.support'
      ],
      badgeKey: 'offers.badges.enterprise',
      ctaKey: 'offers.cta.contact'
    }
  ];

  constructor(public translation: TranslationService, private router: Router) {}

  ngOnInit(): void {}

  calculateSavings(original: number, current: number): number {
    return original - current;
  }

  openModal(offer: Offer): void {
    this.selectedModalOffer = offer;
  }

  closeModal(): void {
    this.selectedModalOffer = null;
  }

  selectOffer(offer: Offer): void {
    this.selectedModalOffer = null;
    this.router.navigate(['/'], { queryParams: { scrollTo: 'contact', offer: offer.id } });
  }

  t(key: string): string {
    return this.translation.instant(key);
  }
  // Lägg till i OffersComponent-klassen

commonFeatures = [
  {
    icon: '🔒',
    titleKey: 'offers.features.ssl.title',
    descriptionKey: 'offers.features.ssl.description'
  },
  {
    icon: '📱',
    titleKey: 'offers.features.responsive.title',
    descriptionKey: 'offers.features.responsive.description'
  },
  {
    icon: '🔍',
    titleKey: 'offers.features.seo.title',
    descriptionKey: 'offers.features.seo.description'
  },
  {
    icon: '⚡',
    titleKey: 'offers.features.performance.title',
    descriptionKey: 'offers.features.performance.description'
  },
  {
    icon: '📊',
    titleKey: 'offers.features.analytics.title',
    descriptionKey: 'offers.features.analytics.description'
  },
  {
    icon: '🛡️',
    titleKey: 'offers.features.backup.title',
    descriptionKey: 'offers.features.backup.description'
  }
];

faqs = [
  {
    questionKey: 'offers.faq.upgrade.question',
    answerKey: 'offers.faq.upgrade.answer'
  },
  {
    questionKey: 'offers.faq.domain.question',
    answerKey: 'offers.faq.domain.answer'
  },
  {
    questionKey: 'offers.faq.commitment.question',
    answerKey: 'offers.faq.commitment.answer'
  },
  {
    questionKey: 'offers.faq.support.question',
    answerKey: 'offers.faq.support.answer'
  }
];
}