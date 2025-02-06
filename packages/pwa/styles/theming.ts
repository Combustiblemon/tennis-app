import {
  ActionIcon,
  Button,
  Checkbox,
  CloseButton,
  createTheme,
  CSSVariablesResolver,
  DEFAULT_THEME,
  Indicator,
  Input,
  mergeMantineTheme,
  Pagination,
  Radio,
  SegmentedControl,
  Table,
  Textarea,
} from '@mantine/core';

import actionIconStyles from '@/styles/MantineComponents/ActionIcon.module.css';
import buttonStyles from '@/styles/MantineComponents/Button.module.css';
import checkboxStyles from '@/styles/MantineComponents/Checkbox.module.css';
import closeButtonStyles from '@/styles/MantineComponents/CloseButton.module.css';
import indicatorStyles from '@/styles/MantineComponents/Indicator.module.css';
import inputStyles from '@/styles/MantineComponents/Input.module.css';
import paginationStyles from '@/styles/MantineComponents/Pagination.module.css';
import radioStyles from '@/styles/MantineComponents/Radio.module.css';
import segmentedControlStyles from '@/styles/MantineComponents/SegmentedControl.module.css';
import tableStyles from '@/styles/MantineComponents/Table.module.css';
import testAreaStyles from '@/styles/MantineComponents/TextArea.module.css';

import baseTheme from './baseTheme';

// We only want to extend the styling of Mantine Components not the entire theme
// The reason we do this is to not break the Mantine Components that are using the default theme
// If we want to alter the design of the used components we can do so by extending the components
// in its own css modules file and then import it here
export const customTheme = createTheme({
  components: {
    Button: Button.extend({
      classNames: buttonStyles,
      defaultProps: {
        variant: 'primary',
      },
    }),
    ActionIcon: ActionIcon.extend({ classNames: actionIconStyles }),
    Input: Input.extend({
      classNames: inputStyles,
      defaultProps: {
        variant: 'primary',
      },
    }),
    Indicator: Indicator.extend({
      classNames: indicatorStyles,
    }),
    Table: Table.extend({
      classNames: tableStyles,
    }),
    Pagination: Pagination.extend({ classNames: paginationStyles }),
    Checkbox: Checkbox.extend({ classNames: checkboxStyles }),
    Radio: Radio.extend({ classNames: radioStyles }),
    CloseButton: CloseButton.extend({ classNames: closeButtonStyles }),
    SegmentedControl: SegmentedControl.extend({
      classNames: segmentedControlStyles,
    }),
    Textarea: Textarea.extend({ classNames: testAreaStyles }),
  },
  other: {
    ...baseTheme,
  },
});

// Since we are using pure css for the best performance we need to define our css variables
// Mantine provides a resolver function that we can use to provide the variables for CSS.
// And can be used like this : background-color: var(--color-red);

const createCssVariables = (prefix: string, obj: object) =>
  Object.entries(obj).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [`--${prefix}-${key}`]: value,
    }),
    {}
  );

// Define your variables
const colorVariables = createCssVariables('color', baseTheme.colors);
const spacingVariables = createCssVariables('spacing', baseTheme.spacing);
const shadowVariables = createCssVariables('shadow', baseTheme.shadows);
const borderRadiusVariables = createCssVariables(
  'radius',
  baseTheme.borderRadius
);

// Resolver function to provide the variables for CSS
// We do not leverage the light and dark theme so no need to provide any custom variables
export const resolver: CSSVariablesResolver = () => ({
  dark: {},
  light: {},
  variables: {
    ...colorVariables,
    ...spacingVariables,
    ...shadowVariables,
    ...borderRadiusVariables,
  },
});

// Merge Mantine theme with custom theme
export const theme = mergeMantineTheme(DEFAULT_THEME, customTheme);
