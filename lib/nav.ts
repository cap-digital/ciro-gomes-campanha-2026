export type NavItem = { id: string; route: string; label: string; color: string; icon: string };

export const NAV_ITEMS: NavItem[] = [
  { id: "inicio", route: "/inicio", label: "Início", color: "#35D0FF", icon: "home" },
  { id: "campanhas", route: "/campanhas", label: "Campanhas", color: "#2E8FFF", icon: "campaign" },
  { id: "criativos", route: "/criativos", label: "Criativos", color: "#F5B301", icon: "collections" },
  { id: "analises", route: "/analises", label: "Análises", color: "#9B7BFF", icon: "lightbulb" },
  { id: "periodo", route: "/periodo", label: "Período", color: "#21C46A", icon: "calendar_month" },
  { id: "desempenho", route: "/desempenho", label: "Desempenho", color: "#35D0FF", icon: "monitoring" },
  { id: "eficiencia", route: "/eficiencia", label: "Eficiência", color: "#21C46A", icon: "bolt" },
  { id: "territorio", route: "/territorio", label: "Território", color: "#F5B301", icon: "map" },
  { id: "publico", route: "/publico", label: "Público", color: "#9B7BFF", icon: "groups" },
  { id: "biblioteca", route: "/biblioteca", label: "Biblioteca de anúncios", color: "#2E8FFF", icon: "inventory_2" },
  { id: "timeline", route: "/linha-do-tempo", label: "Linha do tempo", color: "#E4222B", icon: "timeline" },
  { id: "comparativo", route: "/plataformas", label: "Plataformas", color: "#35D0FF", icon: "compare_arrows" },
  { id: "simulador", route: "/simulador", label: "Simulador", color: "#F5B301", icon: "tune" },
];
