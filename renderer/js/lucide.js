export function refreshLucide(root = document) {
  void root;
  if (!window.lucide || typeof window.lucide.createIcons !== 'function') return;

  window.lucide.createIcons({
    attrs: {
      width: '14',
      height: '14',
      'stroke-width': '1.9',
    },
  });
}
