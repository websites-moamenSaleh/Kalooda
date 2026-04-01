export type Locale = "en" | "ar";

export const translations = {
  en: {
    // Header
    admin: "Admin",
    cart: "Cart",
    navMenu: "Menu",

    // Home hero
    heroTitle1: "Fresh Sweets,",
    heroTitle2: "Delivered Fast",
    heroSubtitle:
      "Hand-crafted chocolates, gummies, pastries & more. Order online and get same-day delivery.",
    browseMenu: "Browse the menu",
    orderNow: "Order now",
    viewCategories: "View categories",
    promoRibbon:
      "Same-day delivery · Hand-finished desserts · Made to impress",
    sectionCategoriesTitle: "Explore by category",
    sectionCategoriesSubtitle:
      "From silky chocolate to oven-fresh pastries — find your craving.",
    sectionSelectionsTitle: "Chef’s selections",
    sectionSelectionsSubtitle:
      "A curated taste of what our kitchen does best — add to your cart in one tap.",
    sectionStoryTitle: "Crafted with care",
    sectionStoryBody:
      "Every recipe is slow-built for depth: real ingredients, careful timing, and presentation worthy of your table. We bake and finish in small batches so what arrives at your door feels as special as dining out.",
    ctaBandTitle: "Ready when you are",
    ctaBandSubtitle:
      "Sign in to save your details, track orders, and check out faster next time.",
    footerTagline: "Premium desserts & sweets — delivered same day.",
    footerExplore: "Explore",
    footerFinePrint: "© Kalooda. Crafted desserts with hospitality at heart.",
    loadingProducts: "Loading products...",
    searchPlaceholder: "Search sweets...",
    all: "All",
    noProducts: "No products found. Try a different search or category.",

    // Product card
    add: "Add",

    // Cart drawer
    yourCart: "Your Cart",
    cartEmpty: "Your cart is empty",
    cartEmptyHint: "Add some sweet treats!",
    each: "each",
    total: "Total",
    proceedToCheckout: "Proceed to Checkout",
    signInToCheckout: "Sign in to checkout",
    orderRequiresSignIn:
      "Your session expired. Please sign in again to place your order.",

    // Chatbot
    chatbotGreeting:
      "Hi! I'm KaloodaBot 🍰 Ask me about our cheesecakes, ingredients, or allergies!",
    sweetBot: "KaloodaBot",
    chatbotSubtitle: "Ask about allergies & ingredients",
    chatbotPlaceholder: "Ask about allergies...",
    chatbotError: "Sorry, something went wrong.",
    chatbotOffline: "Unable to connect. Please try again.",
    typing: "Typing…",
    toggleChat: "Toggle chat",

    // Checkout
    orderPlaced: "Order Placed!",
    orderConfirmation:
      "is pending. Track status updates in My Orders.",
    yourOrder: "Your order",
    continueShopping: "Continue Shopping",
    backToShop: "Back to shop",
    checkout: "Checkout",
    cartEmptyCheckout: "Your cart is empty.",
    browseProducts: "Browse products",
    orderSummary: "Order Summary",
    name: "Name",
    namePlaceholder: "Your name",
    phone: "Phone",
    phonePlaceholder: "+1234567890",
    placeOrder: "Place Order",
    placingOrder: "Placing Order...",
    orderFailed: "Failed to place order. Please try again.",
    orderSchemaOutdated:
      "The database needs updating: run Supabase migrations (add orders.user_id). See supabase/migrations/.",
    profileIncompleteCheckout:
      "Add your name and phone in the form or in your account to place an order.",
    deliveryContact: "Delivery contact",
    editInAccount: "Edit in account",
    checkoutProfileHint:
      "We will save these details to your profile for your next order.",

    // Account
    account: "Account",
    myProfile: "My profile",
    myOrders: "My Orders",
    saveProfile: "Save profile",
    profileSavedToast: "Profile saved.",
    profileSaveFailedToast: "Could not save profile.",
    orderHistoryTitle: "Order history",
    orderHistoryEmpty: "You have no orders yet.",
    viewOrderHistory: "View order history",

    // Admin
    adminDashboard: "Admin Dashboard",
    pending: "Pending",
    preparing: "Preparing",
    outForDelivery: "Out for delivery",
    order: "Order",
    customer: "Customer",
    items: "Items",
    status: "Status",
    actions: "Actions",
    noOrders: "No orders yet.",
    orders: "Orders",
    deleteOrder: "Delete",
    confirmDeleteOrder: "Are you sure you want to delete this order?",
    orderDeleteFailed: "Failed to delete order.",

    // Admin nav
    dashboard: "Dashboard",
    functions: "Functions",

    // Product availability (dashboard)
    productAvailability: "Product Availability",
    available: "Available",
    unavailableToday: "Unavailable Today",
    markUnavailable: "Mark Unavailable",
    markAvailable: "Mark Available",
    noProductsYet: "No products yet.",

    // Functions — Product management
    products: "Products",
    addProduct: "Add Product",
    editProduct: "Edit Product",
    deleteProduct: "Delete",
    saveProduct: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    productName: "Product Name",
    productNameAr: "Product Name (Arabic)",
    description: "Description",
    descriptionAr: "Description (Arabic)",
    ingredients: "Ingredients",
    ingredientsAr: "Ingredients (Arabic)",
    price: "Price",
    stockQuantity: "Stock",
    allergens: "Allergens",
    allergensPlaceholder: "Comma-separated (e.g. dairy, nuts)",
    imageUrl: "Image URL",
    category: "Category",
    selectCategory: "Select category",
    english: "English",
    arabic: "Arabic",
    confirmDeleteProduct: "Are you sure you want to delete this product?",
    productSaved: "Product saved successfully.",
    productSaveFailed: "Failed to save product.",
    productDeleted: "Product deleted.",
    productDeleteFailed: "Failed to delete product.",

    // Categories
    categories: "Categories",
    addCategory: "Add Category",
    categoryName: "Name",
    categoryNameAr: "Name (Arabic)",
    categoryNamePlaceholder: "Category name",
    categoryNameArPlaceholder: "اسم الفئة",
    removeCategory: "Remove",
    noCategories: "No categories yet.",
    categoryAddFailed: "Failed to add category.",
    confirmDeleteCategory: "Are you sure you want to remove this category? Products in this category will become uncategorized.",

    // Drivers
    drivers: "Drivers",
    driverName: "Name",
    driverPhone: "Phone",
    noDrivers: "No drivers yet.",
    addDriver: "Add Driver",
    adding: "Adding...",
    driverNamePlaceholder: "Driver name",
    driverPhonePlaceholder: "+1234567890",
    removeDriver: "Remove",
    driverAdded: "Driver added successfully.",
    driverAddFailed: "Failed to add driver.",

    // Delivery accept
    loadingOrder: "Loading order...",
    orderNotFound: "Order not found or already taken.",
    deliveryAccepted: "Delivery Accepted!",
    orderAssigned: "is now assigned to you.",
    newDelivery: "New Delivery",
    customerLabel: "Customer:",
    yourName: "Your Name",
    enterYourName: "Enter your name",
    acceptDelivery: "Accept Delivery",
    accepting: "Accepting...",

    // Auth
    signIn: "Sign In",
    signUp: "Sign Up",
    signOut: "Sign Out",
    email: "Email",
    password: "Password",
    fullName: "Full Name",
    fullNamePlaceholder: "Your full name",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "Your password",
    phonePlaceholder2: "+1234567890",
    createAccount: "Create Account",
    welcomeBack: "Welcome Back",
    signingIn: "Signing in...",
    signingUp: "Creating account...",
    signInError: "Invalid email or password. Please try again.",
    signUpError: "Could not create account. Please try again.",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
    continueWithGoogle: "Continue with Google",
    or: "or",
    oauthError: "Something went wrong with sign in. Please try again.",
    confirmEmailMessage: "Account created! Please check your email and click the confirmation link before signing in.",
    authErrorTitle: "Account Problem",
    authErrorMessage: "There is a problem with your account. Please contact support for help.",
    contactSupport: "Contact Support",
    adminAccountUseAdminSignIn:
      "Staff accounts cannot use the shop sign-in. Use the admin sign-in page instead.",
    adminSignInTitle: "Admin sign in",
    adminSignInSubtitle: "Dashboard access for staff",
    adminSignInNoAccess: "This account does not have admin access.",
    adminSignInCustomerLink: "Customer shop sign in",

    // Language
    switchLanguage: "العربية",
  },
  ar: {
    // Header
    admin: "لوحة التحكم",
    cart: "السلة",
    navMenu: "القائمة",

    // Home hero
    heroTitle1: "حلويات طازجة،",
    heroTitle2: "توصيل سريع",
    heroSubtitle:
      "شوكولاتة يدوية الصنع، حلوى، معجنات والمزيد. اطلب أونلاين واحصل على توصيل في نفس اليوم.",
    browseMenu: "تصفح القائمة",
    orderNow: "اطلب الآن",
    viewCategories: "عرض الفئات",
    promoRibbon:
      "توصيل في نفس اليوم · حلويات منتهية يدوياً · جاهزة لتبهج مناسبتك",
    sectionCategoriesTitle: "استكشف حسب الفئة",
    sectionCategoriesSubtitle:
      "من الشوكولاتة الناعمة إلى المعجنات الطازجة — اعثر على ما تشتهيه.",
    sectionSelectionsTitle: "اختيارات الشيف",
    sectionSelectionsSubtitle:
      "لمحة مختارة من أبرز ما يقدمه مطبخنا — أضفها لسلتك بنقرة.",
    sectionStoryTitle: "صُنعت بعناية",
    sectionStoryBody:
      "كل وصفة تُبنى ببطء للعمق: مكونات حقيقية وتوقيت دقيق وتقديم يليق بمائدتك. نخبز ونُنهي على دفعات صغيرة ليصلك طلبك بمستوى يضاهي المطاعم.",
    ctaBandTitle: "نحن جاهزون عندما تكون أنت",
    ctaBandSubtitle:
      "سجّل الدخول لحفظ بياناتك وتتبع الطلبات وإتمام الشراء بسرعة لاحقاً.",
    footerTagline: "حلويات وفاخرة — توصيل في نفس اليوم.",
    footerExplore: "استكشف",
    footerFinePrint: "© كالودا. حلويات بروح الضيافة.",
    loadingProducts: "جارٍ تحميل المنتجات...",
    searchPlaceholder: "ابحث عن الحلويات...",
    all: "الكل",
    noProducts: "لم يتم العثور على منتجات. جرّب بحثاً أو فئة مختلفة.",

    // Product card
    add: "أضف",

    // Cart drawer
    yourCart: "سلة التسوق",
    cartEmpty: "سلتك فارغة",
    cartEmptyHint: "أضف بعض الحلويات اللذيذة!",
    each: "للقطعة",
    total: "المجموع",
    proceedToCheckout: "إتمام الشراء",
    signInToCheckout: "سجّل الدخول لإتمام الشراء",
    orderRequiresSignIn:
      "انتهت جلستك. يرجى تسجيل الدخول مرة أخرى لإتمام الطلب.",

    // Chatbot
    chatbotGreeting:
      "مرحباً! أنا كالودا بوت 🍰 اسألني عن كيك الجبن أو المكونات أو الحساسية!",
    sweetBot: "كالودا بوت",
    chatbotSubtitle: "اسأل عن الحساسية والمكونات",
    chatbotPlaceholder: "اسأل عن الحساسية...",
    chatbotError: "عذراً، حدث خطأ ما.",
    chatbotOffline: "تعذر الاتصال. يرجى المحاولة مرة أخرى.",
    typing: "يكتب...",
    toggleChat: "فتح/إغلاق المحادثة",

    // Checkout
    orderPlaced: "تم تقديم الطلب!",
    orderConfirmation: "قيد الانتظار. تابع حالة الطلب من «طلباتي».",
    yourOrder: "طلبك",
    continueShopping: "متابعة التسوق",
    backToShop: "العودة للمتجر",
    checkout: "إتمام الطلب",
    cartEmptyCheckout: "سلتك فارغة.",
    browseProducts: "تصفح المنتجات",
    orderSummary: "ملخص الطلب",
    name: "الاسم",
    namePlaceholder: "اسمك",
    phone: "الهاتف",
    phonePlaceholder: "+1234567890",
    placeOrder: "تأكيد الطلب",
    placingOrder: "جارٍ تأكيد الطلب...",
    orderFailed: "فشل تقديم الطلب. يرجى المحاولة مرة أخرى.",
    orderSchemaOutdated:
      "قاعدة البيانات تحتاج تحديثاً: شغّل ترحيلات Supabase (إضافة orders.user_id). راجع مجلد supabase/migrations/.",
    profileIncompleteCheckout:
      "أضف اسمك ورقم هاتفك في النموذج أو في حسابك لإتمام الطلب.",
    deliveryContact: "بيانات التوصيل",
    editInAccount: "تعديل من الحساب",
    checkoutProfileHint:
      "سنحفظ هذه البيانات في ملفك للطلبات القادمة.",

    // Account
    account: "الحساب",
    myProfile: "ملفي الشخصي",
    myOrders: "طلباتي",
    saveProfile: "حفظ الملف الشخصي",
    profileSavedToast: "تم حفظ الملف الشخصي.",
    profileSaveFailedToast: "تعذر حفظ الملف الشخصي.",
    orderHistoryTitle: "سجل الطلبات",
    orderHistoryEmpty: "لا توجد طلبات بعد.",
    viewOrderHistory: "عرض سجل الطلبات",

    // Admin
    adminDashboard: "لوحة التحكم",
    pending: "قيد الانتظار",
    preparing: "قيد التحضير",
    outForDelivery: "في الطريق للتوصيل",
    order: "الطلب",
    customer: "العميل",
    items: "المنتجات",
    status: "الحالة",
    actions: "الإجراءات",
    noOrders: "لا توجد طلبات بعد.",
    orders: "الطلبات",
    deleteOrder: "حذف",
    confirmDeleteOrder: "هل أنت متأكد من حذف هذا الطلب؟",
    orderDeleteFailed: "فشل في حذف الطلب.",

    // Admin nav
    dashboard: "لوحة القيادة",
    functions: "الوظائف",

    // Product availability (dashboard)
    productAvailability: "توفر المنتجات",
    available: "متوفر",
    unavailableToday: "غير متوفر اليوم",
    markUnavailable: "تعليق المنتج",
    markAvailable: "إتاحة المنتج",
    noProductsYet: "لا توجد منتجات بعد.",

    // Functions — Product management
    products: "المنتجات",
    addProduct: "إضافة منتج",
    editProduct: "تعديل المنتج",
    deleteProduct: "حذف",
    saveProduct: "حفظ",
    saving: "جارٍ الحفظ...",
    cancel: "إلغاء",
    productName: "اسم المنتج",
    productNameAr: "اسم المنتج (عربي)",
    description: "الوصف",
    descriptionAr: "الوصف (عربي)",
    ingredients: "المكونات",
    ingredientsAr: "المكونات (عربي)",
    price: "السعر",
    stockQuantity: "المخزون",
    allergens: "مسببات الحساسية",
    allergensPlaceholder: "مفصولة بفواصل (مثل: ألبان، مكسرات)",
    imageUrl: "رابط الصورة",
    category: "الفئة",
    selectCategory: "اختر فئة",
    english: "الإنجليزية",
    arabic: "العربية",
    confirmDeleteProduct: "هل أنت متأكد من حذف هذا المنتج؟",
    productSaved: "تم حفظ المنتج بنجاح.",
    productSaveFailed: "فشل في حفظ المنتج.",
    productDeleted: "تم حذف المنتج.",
    productDeleteFailed: "فشل في حذف المنتج.",

    // Categories
    categories: "الفئات",
    addCategory: "إضافة فئة",
    categoryName: "الاسم",
    categoryNameAr: "الاسم (عربي)",
    categoryNamePlaceholder: "اسم الفئة",
    categoryNameArPlaceholder: "اسم الفئة",
    removeCategory: "إزالة",
    noCategories: "لا توجد فئات بعد.",
    categoryAddFailed: "فشل في إضافة الفئة.",
    confirmDeleteCategory: "هل أنت متأكد من إزالة هذه الفئة؟ ستصبح المنتجات في هذه الفئة بدون تصنيف.",

    // Drivers
    drivers: "السائقون",
    driverName: "الاسم",
    driverPhone: "رقم الهاتف",
    noDrivers: "لا يوجد سائقون بعد.",
    addDriver: "إضافة سائق",
    adding: "جارٍ الإضافة...",
    driverNamePlaceholder: "اسم السائق",
    driverPhonePlaceholder: "+1234567890",
    removeDriver: "إزالة",
    driverAdded: "تمت إضافة السائق بنجاح.",
    driverAddFailed: "فشل في إضافة السائق.",

    // Delivery accept
    loadingOrder: "جارٍ تحميل الطلب...",
    orderNotFound: "الطلب غير موجود أو تم قبوله بالفعل.",
    deliveryAccepted: "تم قبول التوصيل!",
    orderAssigned: "تم تعيينه لك الآن.",
    newDelivery: "توصيل جديد",
    customerLabel: "العميل:",
    yourName: "اسمك",
    enterYourName: "أدخل اسمك",
    acceptDelivery: "قبول التوصيل",
    accepting: "جارٍ القبول...",

    // Auth
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    signOut: "تسجيل الخروج",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    fullNamePlaceholder: "اسمك الكامل",
    emailPlaceholder: "you@example.com",
    passwordPlaceholder: "كلمة المرور",
    phonePlaceholder2: "+1234567890",
    createAccount: "إنشاء حساب",
    welcomeBack: "مرحباً بعودتك",
    signingIn: "جارٍ تسجيل الدخول...",
    signingUp: "جارٍ إنشاء الحساب...",
    signInError: "بريد إلكتروني أو كلمة مرور غير صحيحة. حاول مرة أخرى.",
    signUpError: "تعذر إنشاء الحساب. حاول مرة أخرى.",
    alreadyHaveAccount: "لديك حساب بالفعل؟",
    dontHaveAccount: "ليس لديك حساب؟",
    continueWithGoogle: "المتابعة مع جوجل",
    or: "أو",
    oauthError: "حدث خطأ أثناء تسجيل الدخول. حاول مرة أخرى.",
    confirmEmailMessage: "تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني والنقر على رابط التأكيد قبل تسجيل الدخول.",
    authErrorTitle: "مشكلة في الحساب",
    authErrorMessage: "هناك مشكلة في حسابك. يرجى التواصل مع الدعم للمساعدة.",
    contactSupport: "التواصل مع الدعم",
    adminAccountUseAdminSignIn:
      "لا يمكن لحسابات الموظفين استخدام تسجيل دخول المتجر. استخدم صفحة تسجيل دخول الإدارة.",
    adminSignInTitle: "تسجيل دخول الإدارة",
    adminSignInSubtitle: "الوصول إلى لوحة التحكم للموظفين",
    adminSignInNoAccess: "هذا الحساب ليس لديه صلاحية الإدارة.",
    adminSignInCustomerLink: "تسجيل دخول متجر العملاء",

    // Language
    switchLanguage: "English",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
