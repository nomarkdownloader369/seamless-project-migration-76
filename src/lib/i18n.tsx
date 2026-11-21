import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";
export const DEFAULT_LANGUAGE: Lang = "ar";
export function visitorLanguage(saved: unknown): Lang { return saved === "en" || saved === "ar" ? saved : DEFAULT_LANGUAGE; }
const dict = {
  en: {
    search: "Search videos…", home: "Home", categories: "Categories", trending: "Trending Now", latest: "Latest Videos",
    profile: "Profile", favorites: "Favorites", views: "views", prev: "Previous", next: "Next", login: "Sign in",
    logout: "Log out", like: "Like", share: "Share", comments: "Comments", related: "Related Videos",
    addComment: "Add a comment…", post: "Post", rights: "All rights reserved.", noResults: "No videos found.",
    signInTitle: "Sign in to TABOOBOX", signInSub: "Sign in to save favorites and comment.",
    continueGoogle: "Continue with Google", guest: "Guest", notSignedIn: "You're not signed in.",
    settings: "Account settings", language: "Language", dashboard: "Dashboard", publish: "AI Video Publisher",
    manage: "Manage Videos", adminTools: "Administrator tools", copied: "Link copied", favAdded: "Added to favorites",
    favSignIn: "Sign in to save videos to your favorites.", googleNotConnected: "Google sign-in isn't connected yet. Please try again later.",
    signingIn: "Redirecting to Google…", favEmpty: "No favorites yet. Tap the heart on any video to save it.", signInHeading: "Welcome back", browse: "Browse videos", email: "Email", password: "Password", name: "Name", signInBtn: "Sign in", signUpBtn: "Create account", tabSignIn: "Sign in", tabSignUp: "Register", or: "or", checkEmail: "Account created. Check your email to confirm it, then sign in.", pwMin: "At least 6 characters",
  },
  ar: {
    search: "دوّر على فيديو…", home: "الرئيسية", categories: "الأقسام", trending: "التريند دلوقتي", latest: "أحدث الفيديوهات",
    profile: "البروفايل", favorites: "المفضلة", views: "مشاهدة", prev: "اللي قبله", next: "اللي بعده", login: "تسجيل الدخول",
    logout: "تسجيل الخروج", like: "عجبني", share: "شير", comments: "التعليقات", related: "فيديوهات شبهه",
    addComment: "اكتب تعليق…", post: "انشر", rights: "كل الحقوق محفوظة.", noResults: "مفيش فيديوهات.",
    signInTitle: "ادخل على TABOOBOX", signInSub: "سجّل دخول عشان تحفظ المفضلة وتعلّق.",
    continueGoogle: "كمّل بجوجل", guest: "زائر", notSignedIn: "إنت مش مسجّل دخول.",
    settings: "إعدادات الحساب", language: "اللغة", dashboard: "لوحة التحكم", publish: "ناشر الفيديو بالذكاء الاصطناعي",
    manage: "إدارة الفيديوهات", adminTools: "أدوات الأدمن", copied: "اللينك اتنسخ", favAdded: "اتضاف للمفضلة",
    favSignIn: "سجّل دخول عشان تحفظ الفيديوهات في المفضلة.", googleNotConnected: "تسجيل الدخول بجوجل لسه مش متوصّل. جرّب تاني بعدين.",
    signingIn: "بنحوّلك لجوجل…", favEmpty: "مفيش مفضلة لسه. دوس على القلب في أي فيديو عشان تحفظه.", signInHeading: "أهلاً بيك", browse: "تصفّح الفيديوهات", email: "الإيميل", password: "كلمة السر", name: "الاسم", signInBtn: "دخول", signUpBtn: "إنشاء حساب", tabSignIn: "دخول", tabSignUp: "تسجيل جديد", or: "أو", checkEmail: "الحساب اتعمل. افتح الإيميل وأكّد الحساب، وبعدين ادخل.", pwMin: "٦ حروف على الأقل",
  },
};
export type DictKey = keyof typeof dict.en;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: DictKey) => string }>({
  lang: "ar", setLang: () => {}, t: (k) => dict.ar[k],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANGUAGE);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("pxd-lang");
    setLang(visitorLanguage(saved));
    setLoaded(true);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    if (loaded) localStorage.setItem("pxd-lang", lang);
  }, [lang, loaded]);
  return <Ctx.Provider value={{ lang, setLang, t: (k) => dict[lang][k] }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
