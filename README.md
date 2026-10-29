# sidekickicons-react-native

React Native package that combines [Heroicons](https://github.com/tailwindlabs/heroicons) and [Sidekickicons](https://github.com/ndri/sidekickicons). The icons are drawn with [react-native-svg](https://github.com/software-mansion/react-native-svg), so they work on Android, iOS and the web (with react-native-web).

Browse all icons at [sidekickicons.com](https://sidekickicons.com/).

## Usage

First, install `@sidekickicons/react-native` and `react-native-svg` from npm:

```bash
npm install @sidekickicons/react-native react-native-svg
```

In an Expo app, install `react-native-svg` with `npx expo install react-native-svg` so its version matches your SDK.

Now each icon can be imported and used as a React Native component. Since there is no official React Native package for Heroicons, the `@sidekickicons/react-native` package includes Heroicons as well.

```tsx
import { BeakerIcon, CrownIcon } from "@sidekickicons/react-native/24/solid";
import { View } from "react-native";

function MyComponent() {
  return (
    <View>
      <CrownIcon color="#3b82f6" />
      <BeakerIcon size={32} color="#22c55e" />
    </View>
  );
}
```

Import the icons from their respective directory:

- 24x24 outline: `@sidekickicons/react-native/24/outline`
- 24x24 solid: `@sidekickicons/react-native/24/solid`
- 20x20 solid: `@sidekickicons/react-native/20/solid`
- 16x16 solid: `@sidekickicons/react-native/16/solid`

Icons use an upper camel case naming convention and are always suffixed with the word `Icon`.

## Props

- `size`: width and height. Defaults to the icon's grid size: 24, 20 or 16.
- `color`: the icon's color. Icons draw with `currentColor`, so on the web they also inherit the surrounding text color when `color` isn't set.
- Any other [`Svg` prop](https://github.com/software-mansion/react-native-svg/blob/main/USAGE.md) from react-native-svg, such as `style`.

Icons are hidden from screen readers. Give the button or link around an icon an accessible label.

The `IconProps` and `IconComponent` types can be imported from the package root:

```ts
import type { IconComponent } from "@sidekickicons/react-native";
```

## Building

If you want to build the library yourself, you can do so by running:

```bash
pnpm build
```

This downloads the optimized SVGs from both icon repositories and generates the components.

## License

MIT. Heroicons are MIT licensed by Tailwind Labs, see `HEROICONS-LICENSE`.
