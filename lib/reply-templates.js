import { getBusinessCopy } from "./business-config";

const TEMPLATES = {
  en: {
    order: [
      { id: "ready20", label: "Ready in 20 min", text: "Order confirmed ✅ Ready in about 20 minutes." },
      { id: "ready30", label: "Ready in 30 min", text: "Order confirmed ✅ Ready in about 30 minutes." },
      { id: "ready45", label: "Ready in 45 min", text: "Order confirmed ✅ Ready in about 45 minutes." },
      { id: "outDelivery", label: "Out for delivery", text: "Your order is out for delivery 🛵" },
      { id: "needAddress", label: "Need address", text: "Order received ✅ Please share your delivery address." },
      { id: "unavailable", label: "Item unavailable", text: "Sorry, one or more items are unavailable right now. Please check and confirm again." },
    ],
    enquiry: [
      { id: "available", label: "Available", text: "Yes, available ✅ You can order / visit as needed." },
      { id: "priceOk", label: "Price as listed", text: "Yes, available. Price is as shown on the page." },
      { id: "comeVisit", label: "Please visit", text: "Yes, available. Please visit the shop for details." },
      { id: "unavailable", label: "Not available", text: "Sorry, not available right now." },
    ],
    booking: [
      { id: "confirmed", label: "Booking confirmed", text: "Booking confirmed ✅ See you at the requested time." },
      { id: "shareTime", label: "Share preferred time", text: "Thanks! Please share your preferred time and we will confirm." },
      { id: "slotOk", label: "Slot available", text: "Your slot looks available. Please confirm to lock it." },
      { id: "unavailable", label: "Slot unavailable", text: "Sorry, that time is not available. Please share another slot." },
    ],
  },
  hi: {
    order: [
      { id: "ready20", label: "20 मिनट में तैयार", text: "ऑर्डर कन्फर्म ✅ लगभग 20 मिनट में तैयार।" },
      { id: "ready30", label: "30 मिनट में तैयार", text: "ऑर्डर कन्फर्म ✅ लगभग 30 मिनट में तैयार।" },
      { id: "ready45", label: "45 मिनट में तैयार", text: "ऑर्डर कन्फर्म ✅ लगभग 45 मिनट में तैयार।" },
      { id: "outDelivery", label: "डिलीवरी के लिए निकला", text: "आपका ऑर्डर डिलीवरी के लिए निकल चुका है 🛵" },
      { id: "needAddress", label: "पता चाहिए", text: "ऑर्डर मिल गया ✅ कृपया अपना डिलीवरी पता भेजें।" },
      { id: "unavailable", label: "आइटम उपलब्ध नहीं", text: "माफ़ कीजिए, कुछ आइटम अभी उपलब्ध नहीं हैं। कृपया दोबारा कन्फर्म करें।" },
    ],
    enquiry: [
      { id: "available", label: "उपलब्ध है", text: "हाँ, उपलब्ध है ✅ जरूरत हो तो ऑर्डर/विजिट कर सकते हैं।" },
      { id: "priceOk", label: "कीमत वही", text: "हाँ, उपलब्ध है। कीमत पेज पर दिखी हुई ही है।" },
      { id: "comeVisit", label: "दुकान आएं", text: "हाँ, उपलब्ध है। डिटेल्स के लिए दुकान पर आएं।" },
      { id: "unavailable", label: "उपलब्ध नहीं", text: "माफ़ कीजिए, अभी उपलब्ध नहीं है।" },
    ],
    booking: [
      { id: "confirmed", label: "बुकिंग कन्फर्म", text: "बुकिंग कन्फर्म ✅ बताए समय पर मिलते हैं।" },
      { id: "shareTime", label: "समय बताएं", text: "धन्यवाद! कृपया अपना पसंदीदा समय भेजें, हम कन्फर्म करेंगे।" },
      { id: "slotOk", label: "स्लॉट उपलब्ध", text: "स्लॉट उपलब्ध लग रहा है। लॉक करने के लिए कन्फर्म करें।" },
      { id: "unavailable", label: "स्लॉट नहीं", text: "माफ़ कीजिए, वह समय उपलब्ध नहीं है। कृपया दूसरा समय बताएं।" },
    ],
  },
};

export function getReplyTemplatesForBusiness(category, locale = "en") {
  const messageType = getBusinessCopy(category, "en").messageType || "order";
  const pack = TEMPLATES[locale] || TEMPLATES.en;
  return pack[messageType] || pack.order;
}
