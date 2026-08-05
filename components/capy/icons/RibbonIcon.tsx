import type { SvgProps } from 'react-native-svg';
import Svg, { Path } from 'react-native-svg';

/** Ported from capy-ui's Figma export. Path data is generated — do not hand-edit. */
export function RibbonIcon(props: SvgProps) {
  return (
    <Svg viewBox="0 0 60.38 18.42" fill="none" {...props}>
      <Path d="M25.6 0L55.59 3.8L60.38 18.42L0 10.79L25.6 0Z" fill="#DF7676" />
    </Svg>
  );
}
