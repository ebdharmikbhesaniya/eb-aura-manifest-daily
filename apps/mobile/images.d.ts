// Static image imports (Metro resolves these to an asset source at build time).
// Expo's own types cover CSS modules but not image assets, so we declare them
// here to allow `import orb from './orb.png'` with a typed source.
declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';

  const value: ImageSourcePropType;
  export default value;
}

declare module '*.jpg' {
  import type { ImageSourcePropType } from 'react-native';

  const value: ImageSourcePropType;
  export default value;
}
