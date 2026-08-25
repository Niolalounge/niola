export const defaultLanguage = 'ar'

export const supportedLanguages = ['ar', 'en']

export const languageMeta = {
  ar: {
    label: 'العربية',
    locale: 'ar-EG',
    dir: 'rtl',
  },
  en: {
    label: 'English',
    locale: 'en-EG',
    dir: 'ltr',
  },
}

export const translations = {
  ar: {
    languageSwitcher: {
      shortLabel: 'EN',
      label: 'التبديل إلى الإنجليزية',
    },

    nav: {
      home: 'الرئيسية',
      about: 'عن نيولا',
      menu: 'القائمة',
      shisha: 'الشيشة',
      gallery: 'المعرض',
      location: 'الموقع',
      contact: 'تواصل معنا',
    },

    hero: {
      eyebrow: 'نيولا لاونج · الزمالك',
      title: 'ليست كل الأماكن تُزار...\nبعضها يُعاش.',
      titleLineOne: 'ليست كل الأماكن تُزار...',
      titleLineTwo: 'بعضها يُعاش.',
      supportingText: 'قهوة، شيشة، وإطلالة على النيل.\nتجربة صُمّمت لتُعاش.',
      supportingLineOne: 'قهوة، شيشة، وإطلالة على النيل.',
      supportingLineTwo: 'تجربة صُمّمت لتُعاش.',
      menuCta: 'استكشف القائمة',
      scrollHint: 'اكتشف نيولا',
    },

    atmosphere: {
      eyebrow: 'أجواء تعيش كل لحظة',
      title: 'تفاصيل صغيرة\nتصنع مساءً جميلاً.',
      titleLineOne: 'تفاصيل صغيرة',
      titleLineTwo: 'تصنع مساءً جميلاً.',
      cta: 'استكشف الأجواء',
      cards: [
        {
          title: 'أجواء فاخرة',
          description: 'راحة وأناقة في كل زاوية',
          alt: 'تفاصيل من أجواء نيولا الأنيقة',
        },
        {
          title: 'إطلالة على النيل',
          description: 'من أجمل مواقع الزمالك',
          alt: 'إطلالة نيولا لاونج على النيل',
        },
        {
          title: 'لأوقاتك الخاصة',
          description: 'مساحة لك ولأصحابك',
          alt: 'جلسة هادئة داخل نيولا لاونج',
        },
      ],
    },

    gallery: {
      eyebrow: 'معرض نيولا',
      title: 'لحظات من نيولا',
      description: 'تفاصيل، أجواء، وإطلالة تحكي التجربة.',
      backHome: 'العودة إلى الرئيسية',
      items: {
        nileView: {
          label: 'إطلالة على النيل',
          alt: 'إطلالة نيولا الليلية على النيل وأفق القاهرة',
        },
        luxuriousAtmosphere: {
          label: 'أجواء فاخرة',
          alt: 'تفاصيل من أجواء نيولا الداخلية الفاخرة',
        },
        niolaCoffee: {
          label: 'قهوة نيولا',
          alt: 'قهوة مقدّمة في أجواء نيولا',
        },
        niolaDayOut: {
          label: 'يوم في نيولا',
          alt: 'لحظة نهارية في نيولا لاونج',
        },
        niolaNile: {
          label: 'نيولا والنيل',
          alt: 'جلسة نيولا المطلة على نهر النيل',
        },
        specialTimes: {
          label: 'أوقات خاصة',
          alt: 'جلسة خاصة ودافئة في نيولا لاونج',
        },
      },
      lightbox: {
        dialogLabel: 'عارض صور نيولا',
        close: 'إغلاق معرض الصور',
        previous: 'الصورة السابقة',
        next: 'الصورة التالية',
        counter: 'الصورة {current} من {total}',
      },
    },

    menu: {
      eyebrow: 'من قائمة نيولا',
      title: 'نكهات لكل مزاج.',
      description: 'اختيارات صُنعت لترافق كل لحظة في نيولا.',
      categoryCta: 'استكشف القسم',
      fullMenuCta: 'استكشف القائمة الكاملة',
      pageEyebrow: 'قائمة نيولا',
      pageTitle: 'اختر ما يناسب مزاجك.',
      pageDescription: 'تصفّح مشروباتك وحلوياتك المفضلة من نيولا.',
      backHome: 'العودة إلى الرئيسية',
      categoryNavLabel: 'تصفّح أقسام القائمة',
      currentCategory: 'القسم الحالي',
      productNameLabel: 'الصنف',
      priceLabel: 'السعر',
      currency: 'جنيه',
      categories: {
        coffee: 'القهوة',
        specialtyCoffee: 'القهوة المختصة',
        icedCoffee: 'القهوة الباردة',
        hotDrinks: 'المشروبات الساخنة',
        tea: 'الشاي',
        freshJuices: 'العصائر الفريش',
        milkshakes: 'الميلك شيك',
        smoothies: 'السموذي',
        desserts: 'الحلويات',
        shisha: 'الشيشة',
      },
      categorySubtitles: {
        coffee: 'دفء القهوة في كل رشفة',
        specialtyCoffee: 'تحضير دقيق ونكهة استثنائية',
        icedCoffee: 'قهوة منعشة على مزاجك',
        hotDrinks: 'لحظات دافئة',
        tea: 'كوب يهدّئ المساء',
        freshJuices: 'انتعاش بطعم الفاكهة',
        milkshakes: 'غني وكريمي',
        smoothies: 'نكهات خفيفة ومنعشة',
        desserts: 'نهاية حلوة للحظة جميلة',
        shisha: 'مزاج المساء في نيولا',
      },
    },

    featuredCoffee: {
      eyebrow: 'لحظة قهوة',
      title: 'قهوة تُحضّر على مهل.',
      description: 'تفاصيل دقيقة، نكهات دافئة، ولحظة تستحق أن تُعاش.',
      cta: 'اكتشف القهوة',
      imageAlt: 'لحظة قهوة بتفاصيل نيولا لاونج',
    },

    nile: {
      eyebrow: 'على ضفاف النيل',
      title: 'خذ وقتك...\nالنيل أمامك.',
      titleLineOne: 'خذ وقتك...',
      titleLineTwo: 'النيل أمامك.',
      imageAlt: 'إطلالة نيولا لاونج على نهر النيل',
    },

    shisha: {
      eyebrow: 'تجربة الشيشة',
      title: 'على مزاجك...\nوفي أجواء نيولا.',
      titleLineOne: 'على مزاجك...',
      titleLineTwo: 'وفي أجواء نيولا.',
      description: 'مساء هادئ، جلسة دافئة، وشيشة كما تحب.',
      cta: 'استكشف الشيشة',
      imageAlt: 'تجربة الشيشة في أجواء نيولا المسائية',
    },

    location: {
      eyebrow: 'زيارتك تبدأ من هنا',
      title: 'نيولا أقرب مما تتخيل.',
      description: 'ننتظرك في قلب الزمالك، على مقربة من النيل.',
      addressLabel: 'العنوان',
      address: 'أم كلثوم، الزمالك، القاهرة، مصر',
      phoneLabel: 'الهاتف',
      phone: '+20 10 6000 3800',
      mapCta: 'افتح الموقع على الخريطة',
      callCta: 'اتصل بنا',
      imageAlt: 'موقع نيولا لاونج في الزمالك',
    },

    footer: {
      tagline: 'قهوة، شيشة، وإطلالة على النيل.',
      navigationLabel: 'روابط أسفل الصفحة',
      copyright: '© نيولا لاونج',
      rights: 'جميع الحقوق محفوظة.',
      creditPrefix: 'تصميم وتطوير',
      creditName: 'ArtiCode',
      creditLabel: 'زيارة موقع ArtiCode',
    },

    a11y: {
      skipToContent: 'انتقل إلى المحتوى الرئيسي',
      primaryNavigation: 'التنقّل الرئيسي',
      mobileNavigation: 'قائمة التنقّل على الهاتف',
      openMenu: 'فتح قائمة التنقّل',
      closeMenu: 'إغلاق قائمة التنقّل',
      homeLink: 'نيولا لاونج — الصفحة الرئيسية',
      logoAlt: 'شعار نيولا لاونج',
      languageSwitcher: 'تغيير لغة الموقع',
      switchToEnglish: 'التبديل إلى الإنجليزية',
      switchToArabic: 'التبديل إلى العربية',
      scrollToSection: 'انتقل إلى القسم التالي',
      heroMedia: 'مدخل وأجواء نيولا لاونج',
      atmosphereGallery: 'معرض أجواء نيولا',
      galleryPage: 'معرض صور نيولا',
      galleryGrid: 'صور من نيولا لاونج',
      galleryImage: 'صورة من معرض نيولا',
      openGalleryImage: 'فتح الصورة بالحجم الكامل',
      galleryLightbox: 'عارض صور نيولا بالحجم الكامل',
      closeGalleryLightbox: 'إغلاق عارض الصور',
      previousGalleryImage: 'عرض الصورة السابقة',
      nextGalleryImage: 'عرض الصورة التالية',
      menuCategories: 'أقسام قائمة نيولا',
      productImage: 'صورة منتج من نيولا',
      nileScene: 'إطلالة نيولا على النيل',
      shishaScene: 'تجربة الشيشة في نيولا',
      locationScene: 'موقع وبيانات التواصل مع نيولا',
      externalLink: 'يفتح في نافذة جديدة',
      callNiola: 'اتصل بنيولا لاونج',
      getDirections: 'افتح اتجاهات الوصول إلى نيولا',
    },
  },

  en: {
    languageSwitcher: {
      shortLabel: 'AR',
      label: 'Switch to Arabic',
    },

    nav: {
      home: 'Home',
      about: 'About Niola',
      menu: 'Menu',
      shisha: 'Shisha',
      gallery: 'Gallery',
      location: 'Location',
      contact: 'Contact',
    },

    hero: {
      eyebrow: 'Niola Lounge · Zamalek',
      title: 'Some places are visited.\nOthers are lived.',
      titleLineOne: 'Some places are visited.',
      titleLineTwo: 'Others are lived.',
      supportingText: 'Coffee, shisha, and the Nile.\nAn experience made to be lived.',
      supportingLineOne: 'Coffee, shisha, and the Nile.',
      supportingLineTwo: 'An experience made to be lived.',
      menuCta: 'Explore the Menu',
      scrollHint: 'Discover Niola',
    },

    atmosphere: {
      eyebrow: 'An atmosphere for every moment',
      title: 'Small details\nmake a beautiful evening.',
      titleLineOne: 'Small details',
      titleLineTwo: 'make a beautiful evening.',
      cta: 'Explore the Atmosphere',
      cards: [
        {
          title: 'Refined Atmosphere',
          description: 'Comfort and elegance in every corner',
          alt: "Details of Niola's elegant atmosphere",
        },
        {
          title: 'A View of the Nile',
          description: "One of Zamalek's most beautiful settings",
          alt: "Niola Lounge's view of the Nile",
        },
        {
          title: 'For Your Own Moments',
          description: 'A space for you and your friends',
          alt: 'A serene seating area inside Niola Lounge',
        },
      ],
    },

    gallery: {
      eyebrow: 'Niola Gallery',
      title: 'Moments at Niola',
      description: 'Atmosphere, details, and views that tell the story.',
      backHome: 'Back to Home',
      items: {
        nileView: {
          label: 'A View of the Nile',
          alt: "Niola's nighttime view of the Nile and Cairo skyline",
        },
        luxuriousAtmosphere: {
          label: 'Refined Atmosphere',
          alt: "Details of Niola's refined interior atmosphere",
        },
        niolaCoffee: {
          label: 'Niola Coffee',
          alt: 'Coffee served in the atmosphere of Niola',
        },
        niolaDayOut: {
          label: 'A Day at Niola',
          alt: 'A daytime moment at Niola Lounge',
        },
        niolaNile: {
          label: 'Niola by the Nile',
          alt: "Niola's lounge seating overlooking the River Nile",
        },
        specialTimes: {
          label: 'Special Moments',
          alt: 'A warm, private seating area at Niola Lounge',
        },
      },
      lightbox: {
        dialogLabel: 'Niola image viewer',
        close: 'Close gallery',
        previous: 'Previous image',
        next: 'Next image',
        counter: 'Image {current} of {total}',
      },
    },

    menu: {
      eyebrow: "From Niola's Menu",
      title: 'Flavours for Every Mood.',
      description: 'A selection made to accompany every moment at Niola.',
      categoryCta: 'Explore Category',
      fullMenuCta: 'Explore the Full Menu',
      pageEyebrow: 'Niola Menu',
      pageTitle: 'Choose What Suits Your Mood.',
      pageDescription: 'Browse your favourite drinks and desserts from Niola.',
      backHome: 'Back to Home',
      categoryNavLabel: 'Browse menu categories',
      currentCategory: 'Current category',
      productNameLabel: 'Item',
      priceLabel: 'Price',
      currency: 'EGP',
      categories: {
        coffee: 'Coffee',
        specialtyCoffee: 'Specialty Coffee',
        icedCoffee: 'Iced Coffee',
        hotDrinks: 'Hot Drinks',
        tea: 'Tea',
        freshJuices: 'Fresh Juices',
        milkshakes: 'Milkshakes',
        smoothies: 'Smoothies',
        desserts: 'Desserts',
        shisha: 'Shisha',
      },
      categorySubtitles: {
        coffee: 'Warmth in every sip',
        specialtyCoffee: 'Precise brewing, exceptional flavour',
        icedCoffee: 'Refreshing coffee, your way',
        hotDrinks: 'Moments of warmth',
        tea: 'A cup to ease into the evening',
        freshJuices: 'Freshness filled with fruit',
        milkshakes: 'Rich and creamy',
        smoothies: 'Light, refreshing flavours',
        desserts: 'A sweet finish to a beautiful moment',
        shisha: "Niola's evening ritual",
      },
    },

    featuredCoffee: {
      eyebrow: 'A Coffee Moment',
      title: 'Coffee, prepared unhurriedly.',
      description: 'Precise details, warm flavours, and a moment worth living.',
      cta: 'Explore Coffee',
      imageAlt: 'A coffee moment with the details of Niola Lounge',
    },

    nile: {
      eyebrow: 'By the Nile',
      title: 'Take your time...\nThe Nile is right here.',
      titleLineOne: 'Take your time...',
      titleLineTwo: 'The Nile is right here.',
      imageAlt: "Niola Lounge's view of the River Nile",
    },

    shisha: {
      eyebrow: 'The Shisha Experience',
      title: 'Just the way you like it...\nIn the atmosphere of Niola.',
      titleLineOne: 'Just the way you like it...',
      titleLineTwo: 'In the atmosphere of Niola.',
      description: 'A quiet evening, a warm setting, and shisha your way.',
      cta: 'Explore Shisha',
      imageAlt: "The shisha experience in Niola's evening atmosphere",
    },

    location: {
      eyebrow: 'Your Visit Starts Here',
      title: 'Niola Is Closer Than You Think.',
      description: 'We await you in the heart of Zamalek, moments from the Nile.',
      addressLabel: 'Address',
      address: 'Om Kolthoum, Zamalek, Cairo, Egypt',
      phoneLabel: 'Phone',
      phone: '+20 10 6000 3800',
      mapCta: 'Open in Maps',
      callCta: 'Call Us',
      imageAlt: 'Niola Lounge location in Zamalek',
    },

    footer: {
      tagline: 'Coffee, shisha, and a view of the Nile.',
      navigationLabel: 'Footer links',
      copyright: '© Niola Lounge',
      rights: 'All rights reserved.',
      creditPrefix: 'Designed & Developed by',
      creditName: 'ArtiCode',
      creditLabel: 'Visit the ArtiCode website',
    },

    a11y: {
      skipToContent: 'Skip to main content',
      primaryNavigation: 'Primary navigation',
      mobileNavigation: 'Mobile navigation',
      openMenu: 'Open navigation menu',
      closeMenu: 'Close navigation menu',
      homeLink: 'Niola Lounge — Home',
      logoAlt: 'Niola Lounge logo',
      languageSwitcher: 'Change website language',
      switchToEnglish: 'Switch to English',
      switchToArabic: 'Switch to Arabic',
      scrollToSection: 'Go to the next section',
      heroMedia: 'The entrance and atmosphere of Niola Lounge',
      atmosphereGallery: 'Niola atmosphere gallery',
      galleryPage: 'Niola image gallery',
      galleryGrid: 'Images from Niola Lounge',
      galleryImage: 'Image from the Niola gallery',
      openGalleryImage: 'Open image at full size',
      galleryLightbox: 'Full-size Niola image viewer',
      closeGalleryLightbox: 'Close image viewer',
      previousGalleryImage: 'Show previous image',
      nextGalleryImage: 'Show next image',
      menuCategories: 'Niola menu categories',
      productImage: 'Niola product image',
      nileScene: "Niola's view of the Nile",
      shishaScene: 'The shisha experience at Niola',
      locationScene: 'Niola location and contact details',
      externalLink: 'Opens in a new window',
      callNiola: 'Call Niola Lounge',
      getDirections: 'Open directions to Niola',
    },
  },
}

export default translations
