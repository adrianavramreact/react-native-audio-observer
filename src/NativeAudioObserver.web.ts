// The web has no native module, so say so clearly as soon as the package is imported.
function failOnWeb(): never {
  throw new Error('react-native-audio-observer works only on iOS and Android.');
}

export default failOnWeb();
