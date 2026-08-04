import { theme } from 'antd'

/**
 * Ant Design theme.
 *
 * Primary is a single hue, 210 degrees, taken from the navbar blue. The earlier
 * ramp drifted from 194 to 210 degrees, so an accent never matched the header.
 * Only lightness varies now, by role and by mode.
 *
 * Neutrals follow web-design-example: warm greys rather than antd's default
 * blue-tinted ones. The frosted-glass surfaces are deliberately not reproduced.
 *
 * The matching CSS custom properties in App.scss style the parts that are not
 * antd components (nav, hero, home cards). Change both together.
 */

// One hue, 210 degrees, taken from the navbar. The old ramp drifted 194 to 210,
// which is why an accent never matched the header. Lightness varies by role and
// mode; the hue does not.
// The deep stop (#022E5A) styles the header and drawer in CSS, not through
// antd tokens, so it lives in App.scss as --brand-deep.
const BRAND = '#1D73C9' // interactive, light mode
const BRAND_ON_DARK = '#519EEC' // interactive, dark mode

const shared = {
  colorPrimary: BRAND,
  // The brighter stop reads better as a link than the primary does, and keeps
  // links distinguishable from filled primary buttons.
  colorLink: BRAND,
  colorInfo: BRAND,
  // Radii follow the same scale as the spacing tokens in App.scss: 8 for
  // fields, 16 for surfaces. borderRadiusSM is set because antd derives it as 6
  // otherwise, which left Tag as the only element in the interface at 6px.
  borderRadius: 8,
  borderRadiusSM: 8,
  borderRadiusLG: 16,
  fontSize: 14,

  // 8px scale, so comparable elements cannot drift apart.
  paddingXS: 8,
  padding: 16,
  paddingLG: 24,
  marginXS: 8,
  margin: 16,
  marginLG: 24,
  marginXL: 32,
}

const light = {
  ...shared,
  colorBgLayout: '#E9F0F7',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorText: '#1d1d1f',
  colorTextSecondary: '#6e6e73',
  colorTextTertiary: '#aeaeb2',
  colorBorder: 'rgba(0, 0, 0, 0.10)',
  colorBorderSecondary: 'rgba(0, 0, 0, 0.08)',
}

const dark = {
  ...shared,
  // On dark surfaces the mid brand tone is too low-contrast, so the ramp
  // shifts up one stop.
  colorPrimary: BRAND_ON_DARK,
  colorLink: BRAND_ON_DARK,
  colorBgLayout: '#141C24',
  colorBgContainer: '#1E2933',
  colorBgElevated: '#1E2933',
  colorText: '#f5f5f7',
  colorTextSecondary: '#a1a1a6',
  colorTextTertiary: '#636366',
  colorBorder: 'rgba(255, 255, 255, 0.10)',
  colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
}

/** ConfigProvider theme for the given mode. */
export const buildTheme = (isDark) => ({
  algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: isDark ? dark : light,
  components: {
    Button: { borderRadius: 100, borderRadiusLG: 100, borderRadiusSM: 100 },
    Segmented: {
      borderRadius: 100,
      borderRadiusLG: 100,
      borderRadiusSM: 100,
      itemSelectedBg: isDark ? BRAND_ON_DARK : BRAND,
      itemSelectedColor: '#ffffff',
      trackPadding: 4,
    },
    // Measurement tables get read, not skimmed.
    Table: {
      cellPaddingBlock: 14,
      headerBg: 'transparent',
      headerSplitColor: 'transparent',
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    },
    Card: {
      paddingLG: 24,
    },
  },
})

export const DARK_QUERY = '(prefers-color-scheme: dark)'
