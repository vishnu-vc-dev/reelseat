/**
 * Ant Design theme tokens. One place to change the brand look.
 */
export const BRAND = '#f84464';
export const INK = '#1f2533';

const theme = {
  token: {
    colorPrimary: BRAND,
    colorLink: BRAND,
    borderRadius: 8,
    fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
  },
  components: {
    Layout: { headerBg: INK, bodyBg: '#f5f5fa', footerBg: INK },
  },
};

export default theme;
