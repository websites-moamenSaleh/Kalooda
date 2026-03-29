export type Locale = "en" | "ar";

export const translations = {
  en: {
    // Header
    admin: "Admin",
    cart: "Cart",

    // Home hero
    heroTitle1: "Fresh Sweets,",
    heroTitle2: "Delivered Fast",
    heroSubtitle:
      "Hand-crafted chocolates, gummies, pastries & more. Order online and get same-day delivery.",
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

    // Chatbot
    chatbotGreeting:
      "Hi! I'm SweetBot 🍬 Ask me about our products, ingredients, or allergies!",
    sweetBot: "SweetBot",
    chatbotSubtitle: "Ask about allergies & ingredients",
    chatbotPlaceholder: "Ask about allergies...",
    chatbotError: "Sorry, something went wrong.",
    chatbotOffline: "Unable to connect. Please try again.",
    typing: "Typing…",
    toggleChat: "Toggle chat",

    // Checkout
    orderPlaced: "Order Placed!",
    orderConfirmation:
      "is being prepared. A driver will be notified shortly.",
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

    // Admin
    adminDashboard: "Admin Dashboard",
    pending: "Pending",
    assigned: "Assigned",
    outForDelivery: "Out for Delivery",
    delivered: "Delivered",
    ordersAwaiting: "order(s) awaiting driver assignment. Copy the delivery link and send it to your driver pool.",
    order: "Order",
    customer: "Customer",
    items: "Items",
    status: "Status",
    actions: "Actions",
    copied: "Copied!",
    driverLink: "Driver Link",
    noOrders: "No orders yet.",

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

    // Language
    switchLanguage: "العربية",
  },
  ar: {
    // Header
    admin: "لوحة التحكم",
    cart: "السلة",

    // Home hero
    heroTitle1: "حلويات طازجة،",
    heroTitle2: "توصيل سريع",
    heroSubtitle:
      "شوكولاتة يدوية الصنع، حلوى، معجنات والمزيد. اطلب أونلاين واحصل على توصيل في نفس اليوم.",
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

    // Chatbot
    chatbotGreeting:
      "مرحباً! أنا سويت بوت 🍬 اسألني عن منتجاتنا أو المكونات أو الحساسية!",
    sweetBot: "سويت بوت",
    chatbotSubtitle: "اسأل عن الحساسية والمكونات",
    chatbotPlaceholder: "اسأل عن الحساسية...",
    chatbotError: "عذراً، حدث خطأ ما.",
    chatbotOffline: "تعذر الاتصال. يرجى المحاولة مرة أخرى.",
    typing: "يكتب...",
    toggleChat: "فتح/إغلاق المحادثة",

    // Checkout
    orderPlaced: "تم تقديم الطلب!",
    orderConfirmation: "قيد التحضير. سيتم إخطار السائق قريباً.",
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

    // Admin
    adminDashboard: "لوحة التحكم",
    pending: "قيد الانتظار",
    assigned: "تم التعيين",
    outForDelivery: "في الطريق",
    delivered: "تم التوصيل",
    ordersAwaiting: "طلب(ات) بانتظار تعيين سائق. انسخ رابط التوصيل وأرسله إلى السائقين.",
    order: "الطلب",
    customer: "العميل",
    items: "المنتجات",
    status: "الحالة",
    actions: "الإجراءات",
    copied: "تم النسخ!",
    driverLink: "رابط السائق",
    noOrders: "لا توجد طلبات بعد.",

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

    // Language
    switchLanguage: "English",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
