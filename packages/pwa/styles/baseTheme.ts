// The baseTheme object is used to establish the design system of the application.
// The reason we do this is because we want to extend the design of the Mantine Theming with our own custom design
// Without breaking the Mantine Components that are using the default theme

const colors = {
  white: 'rgba(255, 255, 255, 1)', // * exists in the design
  black: 'rgba(37, 38, 43, 1)', // * exists in the design
  blue: 'rgba(21, 144, 193, 1)', // * exists in the design
  onHoverBlue: 'rgba(21, 144, 193, 0.8)',
  darkerBlue: 'rgba(21, 120, 158, 1)', // * exists in the design
  turquoise: 'rgba(58, 158, 167, 1)',
  turquoise01: 'rgba(58, 158, 167, 0.1)',
  red: 'rgba(255, 0, 0, 1)',
  onHoverRed: 'rgba(255, 0, 0, 0.8)',
  error: 'rgba(255, 0, 0, 0.4)',
  gray: 'rgba(186, 187, 187, 1)',
  gray25: 'rgba(248, 249, 250, 1)', // Used as selected background color for select dropdown
  gray50: 'rgba(232, 232, 232, 1)', // * exists in the design used for the background of the app layout
  gray100: 'rgba(233, 236, 239, 1)', // * exists in the design
  gray200: ' rgba(209, 210, 210, 1)', // * exists in the design
  gray300: 'rgba(209, 210, 210, 0.8)', // Used for inputs border
  gray400: 'rgba(173, 176, 179, 1)',
  gray500: 'rgba(139, 142, 141, 1)',
  gray600: 'rgba(99, 102, 101, 1)',
  gray700: 'rgba(79, 82, 81, 1)',
  gray800: 'rgba(59, 62, 61, 1)',
  gray900: 'rgba(39, 42, 41, 1)',
  danger: 'rgba(198, 96, 88, 1)', // * exists in the design
  darkerDanger: 'rgba(176, 80, 72, 1)',
  veryLightGreen: 'rgba(222, 238, 239, 1)', // * exists in the design
  green: 'rgba(95, 155, 77, 1)', // * exists in the design
  onHoverGreen: 'rgba(95, 155, 77, 0.8)', // * exists in the design
  darkerGreen: 'rgba(71, 136, 51, 1)', // * exists in the design
  bg2: 'rgba(251, 254, 254, 1)',
  bg3: 'rgba(239, 239, 239, 1)',
  darkBg1: 'rgba(116, 119, 119, 1)',
  yellow: 'rgba(222, 184, 64, 1)',
  purple: 'rgba(127, 93, 157, 1)',
} as const;

const spacing = {
  xs: '4px',
  sm: '8px',
  smd: '12px',
  md: '16px',
  mdl: '20px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
  '5xl': '128px',
} as const;

// Might not needed in the future
const borderRadius = {
  '2xs': '4px',
  xs: '8px',
  sm: '12px',
  smd: '16px',
  md: '24px',
  mdl: '28px',
  lg: '32px',
  xl: '48px',
  roundedFull: '50%',
} as const;

// Might not needed in the future
const shadows = {
  default: `0px 2px 3px 1px rgba(0,0,0,0.12)`,
  hover: '0px 2px 6px 4px rgba(0,0,0,0.12)',
  layer: '0px 0px 15px 4px rgba(0,0,0,0.08)',
  letter: '-2px 2px 4px rgba(0,0,0,0.50)',
} as const;

const baseTheme: {
  colors: typeof colors;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
} = {
  borderRadius,
  colors,
  shadows,
  spacing,
};

export default baseTheme;
