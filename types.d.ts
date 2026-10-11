import type * as React from "react";
import type Svg from "react-native-svg";
import type { NumberProp, SvgProps } from "react-native-svg";

export interface IconProps extends SvgProps {
  /** Width and height. Defaults to the icon's grid: 24, 20 or 16. */
  size?: NumberProp;
}

/** Every icon component has this type. */
export type IconComponent = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<Svg>>;
