// מאפשר להתקין את האפליקציה למסך הבית של הטלפון (PWA).
export default function manifest() {
  return {
    name: "GILOS +",
    short_name: "GILOS",
    description: "פרסום קבוע לרשתות החברתיות, עם עריכת AI",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "he",
    dir: "rtl",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
